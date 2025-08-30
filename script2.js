// API Keys (Replace OpenAI key with your own; Google key provided)

        let isSubscribed = false;

        function unlockForm(plan) {
            // You could also add real payment/code verification here.
            document.getElementById("paywall").style.display = "none"; 
            document.getElementById("thumbnailForm").style.display = "block"; 
            console.log("Unlocked with plan:", plan);
        }

        function handlePayment(plan, amount) {
            // Simulate payment processing (replace with actual payment gateway integration, e.g., Razorpay)
            //alert(`Processing payment of ₹${amount} for ${plan} plan...`);
            // Assume payment is successful for demo purposes
            isSubscribed = true;
            document.getElementById('paywall').style.display = 'none';
            document.getElementById('thumbnailForm').style.display = 'block';
        }

        // function redeemCode() {
        //     const code = document.getElementById("redeemCode").value;
        //     if(code.trim() === "") {
        //         alert("Please enter a code.");
        //     } else {
        //         if(code === "FREE") {
        //             // You can replace this with actual verification logic
        //         alert("Code applied successfully: " + code);
        //         isSubscribed = true;
        //     document.getElementById('paywall').style.display = 'none';
        //     document.getElementById('thumbnailForm').style.display = 'block';
        //     handlePayment('free', 0);
        //     }
    //       }
     
    //     }

        async function generateThumbnails() {
            if (!isSubscribed) {
                alert('Please choose a payment plan to generate thumbnails!');
                return;
            }

            const photoFile = document.getElementById('photo').files[0];
            if (!photoFile) {
                alert('Please upload a photo, dude!');
                return;
            }

            const videoType = document.getElementById('videoType').value;
            const style = document.getElementById('style').value;
            const mood = document.getElementById('mood').value;
            const placement = document.getElementById('placement').value;
            const inspiration = document.getElementById('inspiration').value.trim();

            // Convert photo to base64
            const photoBase64 = await fileToBase64(photoFile);
            const photoMime = photoFile.type;

            let inspirationPart = '';
            if (inspiration) {
                const styleDescription = await getStyleDescription(inspiration);
                inspirationPart = ` inspired by the thumbnail style of ${inspiration}: ${styleDescription}`;
            }

            // Create initial prompt with retro theme
            const initialPrompt = `Create a professional YouTube thumbnail with a retro aesthetic for a ${videoType} video in ${style} style with a ${mood} mood${inspirationPart}. Incorporate the provided person's photo placed on the ${placement}. Use retro elements like neon colors, pixel art, or 80s-inspired designs.`;

            // Rewrite prompt using OpenAI
            const rewrittenPrompt = await rewritePromptWithOpenAI(initialPrompt);

            // Define orientations
            const orientations = [
                { type: 'horizontal', aspect: '16:9 (1280x720 resolution)', filename: 'retro-horizontal' },
                { type: 'vertical', aspect: '9:16 (1080x1920 resolution)', filename: 'retro-vertical' }
            ];

            // Generate 3 variations per orientation
            const numVariations = 3;
            const generatedImages = [];

            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '<p>Generating retro thumbnails... Hang tight!</p>';

            try {
                for (const orient of orientations) {
                    for (let i = 1; i <= numVariations; i++) {
                        const genPrompt = `${rewrittenPrompt} Generate in ${orient.aspect} aspect ratio. Create variation ${i} with slight differences in retro layout, neon colors, or pixel effects for diversity. Use the provided image as the person's photo and integrate it seamlessly with retro design elements.`;
                        
                        const imageBase64 = await generateImageWithGemini(genPrompt, photoBase64, photoMime);
                        
                        const filename = `${orient.filename}-variation-${i}.png`;
                        generatedImages.push({ base64: imageBase64, filename });

                        // Display immediately
                        appendImageToResults(imageBase64, filename);
                    }
                }

                // Add download all ZIP button
                const zipButton = document.createElement('button');
                zipButton.id = 'zipButton';
                zipButton.textContent = 'Download All as Retro ZIP';
                zipButton.onclick = () => downloadAsZip(generatedImages);
                resultsDiv.appendChild(zipButton);

            } catch (error) {
                resultsDiv.innerHTML += `<p>Error: ${error.message}</p>`;
            }
        }

        async function getStyleDescription(youtuber) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: `Describe the typical thumbnail style used by YouTuber ${youtuber}. Be detailed about colors, layouts, text styles, common elements, and overall aesthetic in 2-3 sentences.`
                    }],
                    max_tokens: 100
                })
            });

            if (!response.ok) throw new Error('OpenAI API error');

            const data = await response.json();
            return data.choices[0].message.content;
        }

        async function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
            });
        }

        async function rewritePromptWithOpenAI(initialPrompt) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: `Rewrite this into a highly detailed, professional prompt optimized for AI image generation, emphasizing retro aesthetics (neon colors, pixel art, 80s vibe), including specifics on composition, colors, and integration of the provided photo: ${initialPrompt}`
                    }],
                    max_tokens: 200
                })
            });

            if (!response.ok) throw new Error('OpenAI API error');

            const data = await response.json();
            return data.choices[0].message.content;
        }

        async function generateImageWithGemini(prompt, imageBase64, mimeType) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GOOGLE_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType, data: imageBase64 } }
                        ]
                    }]
                })
            });

            if (!response.ok) throw new Error('Gemini API error');

            const data = await response.json();
            const imagePart = data.candidates[0].content.parts.find(part => part.inlineData && part.inlineData.mimeType.startsWith('image/'));
            if (!imagePart) throw new Error('No image generated');

            return imagePart.inlineData.data;
        }

        function appendImageToResults(base64, filename) {
            const resultsDiv = document.getElementById('results');
            
            const container = document.createElement('div');
            container.className = 'thumbnail-container';
            
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${base64}`;
            
            const downloadLink = document.createElement('a');
            downloadLink.href = img.src;
            downloadLink.download = filename;
            downloadLink.textContent = 'Download';
            
            const copyButton = document.createElement('button');
            copyButton.textContent = 'Copy to Clipboard';
            copyButton.onclick = () => copyImageToClipboard(base64);
            
            const shareButton = document.createElement('button');
            shareButton.textContent = 'Share Link';
            shareButton.onclick = () => {
                const dataUrl = `data:image/png;base64,${base64}`;
                navigator.clipboard.writeText(dataUrl).then(() => alert('Data URL copied! Paste it to share.'));
            };
            
            container.appendChild(img);
            container.appendChild(downloadLink);
            container.appendChild(copyButton);
            container.appendChild(shareButton);
            resultsDiv.appendChild(container);
        }

        function copyImageToClipboard(base64) {
            const img = new Image();
            img.src = `data:image/png;base64,${base64}`;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                canvas.toBlob(blob => {
                    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                        .then(() => alert('Image copied to clipboard!'))
                        .catch(err => alert('Error copying: ' + err));
                });
            };
        }

        function downloadAsZip(images) {
            const zip = new JSZip();
            images.forEach(img => {
                zip.file(img.filename, img.base64, { base64: true });
            });
            zip.generateAsync({ type: 'blob' }).then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'retro-thumbnails.zip';
                a.click();
                URL.revokeObjectURL(url);
            });
        }

//         function redeemCode() {
//     const code = document.getElementById("redeemCode").value;
//     if(code.trim() === "") {
//         alert("Please enter a code.");
//     } else {
//         // You can replace this with actual verification logic
//         alert("Code applied: " + code);
//     }
// }
