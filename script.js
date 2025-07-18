console.log('script loaded');

const uploadBox = document.querySelector(".upload-box"),
  previewImg = uploadBox.querySelector("img"),
  fileInput = uploadBox.querySelector("input"),
  widthInput = document.querySelector(".width input"),
  heightInput = document.querySelector(".height input"),
  ratioInput = document.querySelector(".ratio input"),
  qualityInput = document.querySelector(".quality input"),
  downloadBtn = document.querySelector(".download-btn");

let ogImageRatio;
let uploadedFile;

const loadFile = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  uploadedFile = file;
  previewImg.src = URL.createObjectURL(file);
  previewImg.addEventListener("load", () => {
    widthInput.value = previewImg.naturalWidth;
    heightInput.value = previewImg.naturalHeight;
    ogImageRatio = previewImg.naturalWidth / previewImg.naturalHeight;
    document.querySelector(".wrapper").classList.add("active");
  });
};

widthInput.addEventListener("keyup", () => {
  if (ratioInput.checked) {
    heightInput.value = Math.floor(widthInput.value / ogImageRatio);
  }
});
heightInput.addEventListener("keyup", () => {
  if (ratioInput.checked) {
    widthInput.value = Math.floor(heightInput.value * ogImageRatio);
  }
});

const uploadToS3 = async () => {
  if (!uploadedFile) return alert("Please upload an image first.");

  const filename = uploadedFile.name;

  try {
    // 1. Get pre-signed URL from backend
    const response = await fetch("https://twjknthie0.execute-api.ap-south-1.amazonaws.com/prod/GeneratePresignedURL", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename })
    });

    const data = await response.json();
    console.log("Presigned URL:", data);

    const url = data.url;

    // 2. Upload file to S3
    await fetch(url, {
      method: "PUT",
      body: uploadedFile,
    });

    // 3. Show status message
    let status = document.getElementById("status-msg");
    status.innerText = "Image uploaded. Waiting for compression...";

    // 4. Poll for compressed image
    const compressedUrl = `https://fardin-image-compressor.s3.amazonaws.com/compressed/${filename}`;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const check = await fetch(compressedUrl, { method: "HEAD" });
      if (check.ok || attempts > 15) {
        clearInterval(interval);
        if (check.ok) {
          status.innerHTML = `<a href="${compressedUrl}" download>Download Compressed Image</a>`;
        } else {
          status.innerText = "Compression timed out. Please try again.";
        }
      }
    }, 2000);

  } catch (error) {
    console.error("Upload error:", error);
    alert("Error during upload. Check the console for details.");
  }
};

downloadBtn.addEventListener("click", uploadToS3);
fileInput.addEventListener("change", loadFile);
uploadBox.addEventListener("click", () => fileInput.click());

