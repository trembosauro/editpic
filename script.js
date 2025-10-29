tailwind.config = {
        theme: {
          extend: {
            colors: {
              primary: "var(--primary-color)",
              "primary-text": "var(--primary-text-color)",
              secondary: "var(--secondary-color)",
              "dark-bg": "var(--dark-bg-color)",
              "card-bg": "var(--card-bg-color)",
              "text-color": "var(--text-color)",
              "text-muted": "var(--text-muted-color)",
              "border-color": "var(--border-color)",
            },
          },
        },
      };
      document.addEventListener("DOMContentLoaded", () => {
        // Initialize Tippy.js
        if (typeof tippy === 'function') {
            tippy('[title]', {
              content: (reference) => reference.getAttribute('title'),
              theme: 'material',
              arrow: false,
              animation: 'scale-subtle',
            });
        } else {
            console.error('Tippy.js did not load.');
        }

        const fileInput = document.getElementById("fileInput");
        const canvas = document.getElementById("imageCanvas");
        const ctx = canvas.getContext("2d");
        const downloadButton = document.getElementById("downloadButton");
        const changeImageButton = document.getElementById("changeImageButton");
        const statusMessage = document.getElementById("statusMessage");
        const canvasContainer = document.getElementById("canvas-container");
        const centerUploadArea = document.getElementById("centerUploadArea");
        const cropButton = document.getElementById("cropButton");
        const rotateButton = document.getElementById("rotateButton");
        const flipHorizontalButton = document.getElementById(
          "flipHorizontalButton"
        );
        const flipVerticalButton =
          document.getElementById("flipVerticalButton");
        const cropSelection = document.getElementById("cropSelection");
        const resetButton = document.getElementById("resetButton");
        const cropActions = document.getElementById("crop-actions");
        const confirmCrop = document.getElementById("confirmCrop");
        const cancelCrop = document.getElementById("cancelCrop");

        let currentImage = null;
        let originalImage = null;
        let rotationAngle = 0;
        let flipH = 1;
        let flipV = 1;
        const filterSettings = {
          exposure: 100,
          contrast: 100,
          saturation: 100,
          blur: 0,
        };
        let isCropping = false;
        let cropStartX, cropStartY;
        let cropRect = { x: 0, y: 0, width: 0, height: 0 };

        function buildFilterString() {
          let filter = `brightness(${filterSettings.exposure}%) contrast(${filterSettings.contrast}%) saturate(${filterSettings.saturation}%)`;
          if (filterSettings.blur > 0) {
            filter += ` blur(${filterSettings.blur}px)`;
          }
          return filter;
        }

        function applyCssFilters() {
          if (currentImage) {
            const filter = buildFilterString();
            canvas.style.filter = filter;
          }
        }

        function drawImageOnCanvas() {
          if (!currentImage) return;
          const imgWidth = currentImage.naturalWidth || currentImage.width;
          const imgHeight = currentImage.naturalHeight || currentImage.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(flipH, flipV);
          ctx.rotate((rotationAngle * Math.PI) / 180);
          ctx.drawImage(
            currentImage,
            -imgWidth / 2,
            -imgHeight / 2,
            imgWidth,
            imgHeight
          );
          ctx.restore();
          applyCssFilters();
        }

        let statusTimeout;
        function updateStatus(message) {
          if (statusMessage) {
            statusMessage.textContent = message;
            clearTimeout(statusTimeout);
            statusTimeout = setTimeout(() => {
              if (statusMessage) statusMessage.textContent = "";
            }, 3000);
          }
        }

        function toggleTransformationButtons(enabled) {
          if (rotateButton) rotateButton.disabled = !enabled;
          if (flipHorizontalButton) flipHorizontalButton.disabled = !enabled;
          if (flipVerticalButton) flipVerticalButton.disabled = !enabled;
          if (cropButton) cropButton.disabled = !enabled;
          if (resetButton) resetButton.disabled = !enabled;
          if (downloadButton) downloadButton.disabled = !enabled;
          if (changeImageButton)
            changeImageButton.style.display = enabled ? "flex" : "none";
        }

        if (fileInput) {
          fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (currentImage) {
              resetAllEdits(true);
            }
            const reader = new FileReader();
            reader.onload = function (event) {
              const img = new Image();
              img.onload = function () {
                currentImage = img;
                originalImage = img;
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                applyCssFilters();
                toggleTransformationButtons(true);
                canvas.classList.remove("hidden");
                if (centerUploadArea) centerUploadArea.classList.add("hidden");
                updateStatus("Image loaded successfully.");
              };
              img.onerror = function () {
                updateStatus("Error loading image.");
                toggleTransformationButtons(false);
              };
              img.src = event.target.result;
            };
            reader.readAsDataURL(file);
          });
        }

        if (changeImageButton) {
          changeImageButton.addEventListener("click", () => {
            if (fileInput) fileInput.click();
          });
        }

        document
          .querySelectorAll('#controls input[type="range"]')
          .forEach((slider) => {
            if (slider) {
              slider.addEventListener("input", (e) => {
                const id = e.target.id;
                let value = e.target.value;
                if (id === "blur") {
                  filterSettings[id] = parseFloat(value);
                } else {
                  filterSettings[id] = parseInt(value);
                }
                applyCssFilters();
              });
            }
          });

        function redrawImageWithTransformations() {
          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d");
          const imgWidth = currentImage.naturalWidth || currentImage.width;
          const imgHeight = currentImage.naturalHeight || currentImage.height;
          if (rotationAngle === 90 || rotationAngle === 270) {
            tempCanvas.width = imgHeight;
            tempCanvas.height = imgWidth;
          } else {
            tempCanvas.width = imgWidth;
            tempCanvas.height = imgHeight;
          }
          tempCtx.save();
          tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
          tempCtx.scale(flipH, flipV);
          tempCtx.rotate((rotationAngle * Math.PI) / 180);
          tempCtx.drawImage(
            currentImage,
            -imgWidth / 2,
            -imgHeight / 2,
            imgWidth,
            imgHeight
          );
          tempCtx.restore();
          const newImage = new Image();
          newImage.onload = () => {
            currentImage = newImage;
            canvas.width = currentImage.width;
            canvas.height = currentImage.height;
            drawImageOnCanvas();
          };
          newImage.src = tempCanvas.toDataURL();
        }

        if (rotateButton) {
          rotateButton.addEventListener("click", () => {
            if (isCropping) exitCropMode(false);
            if (!currentImage) return;
            rotationAngle = (rotationAngle + 90) % 360;
            redrawImageWithTransformations();
            updateStatus(`Image rotated to ${rotationAngle}°`);
          });
        }

        if (flipHorizontalButton) {
          flipHorizontalButton.addEventListener("click", () => {
            if (isCropping) exitCropMode(false);
            if (!currentImage) return;
            flipH *= -1;
            redrawImageWithTransformations();
            updateStatus(
              flipH === -1
                ? "Image flipped horizontally"
                : "Horizontal flip removed"
            );
          });
        }

        if (flipVerticalButton) {
          flipVerticalButton.addEventListener("click", () => {
            if (isCropping) exitCropMode(false);
            if (!currentImage) return;
            flipV *= -1;
            redrawImageWithTransformations();
            updateStatus(
              flipV === -1
                ? "Image flipped vertically"
                : "Vertical flip removed"
            );
          });
        }

        function resetAllEdits(isNewImage = false) {
          if (!originalImage && !isNewImage) return;

          document.getElementById("exposure").value = 100;
          document.getElementById("contrast").value = 100;
          document.getElementById("saturation").value = 100;
          document.getElementById("blur").value = 0;

          Object.assign(filterSettings, {
            exposure: 100,
            contrast: 100,
            saturation: 100,
            blur: 0,
          });

          rotationAngle = 0;
          flipH = 1;
          flipV = 1;

          exitCropMode(false);

          if (isNewImage) {
            currentImage = null;
            originalImage = null;
            canvas.classList.add("hidden");
            if (centerUploadArea) centerUploadArea.classList.remove("hidden");
            toggleTransformationButtons(false);
            updateStatus("");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          } else {
            currentImage = originalImage;
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            drawImageOnCanvas();
            updateStatus("All edits have been reset.");
          }
        }

        function applyCrop() {
          if (!currentImage || cropRect.width === 0 || cropRect.height === 0) {
            updateStatus("No valid crop area selected.");
            return;
          }
          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d");
          tempCanvas.width = cropRect.width;
          tempCanvas.height = cropRect.height;
          tempCtx.drawImage(
            currentImage,
            cropRect.x,
            cropRect.y,
            cropRect.width,
            cropRect.height,
            0,
            0,
            cropRect.width,
            cropRect.height
          );
          const newImage = new Image();
          newImage.onload = () => {
            currentImage = newImage;
            canvas.width = currentImage.width;
            canvas.height = currentImage.height;
            drawImageOnCanvas();
            updateStatus("Image cropped successfully.");
          };
          newImage.src = tempCanvas.toDataURL();
        }

        function exitCropMode(apply = false) {
            if (apply && cropRect.width > 0 && cropRect.height > 0) {
                applyCrop();
            }
            isCropping = false;
            cropActions.classList.add("hidden");
            cropSelection.style.display = "none";
            cropButton.classList.remove("active-transform-button");
            canvas.style.cursor = "default";
        }

        if (cropButton) {
          cropButton.addEventListener("click", () => {
            if (!currentImage || isCropping) return;
            isCropping = true;
            updateStatus("Crop mode activated. Drag to select area.");
            cropButton.classList.add("active-transform-button");
            cropRect = { x: 0, y: 0, width: 0, height: 0 };
            cropSelection.style.width = "0px";
            cropSelection.style.height = "0px";
            cropSelection.style.left = "0px";
            cropSelection.style.top = "0px";
            canvas.style.cursor = "crosshair";
          });
        }

        cropActions.addEventListener("mousedown", (e) => e.stopPropagation());
        confirmCrop.addEventListener("click", () => exitCropMode(true));
        cancelCrop.addEventListener("click", () => exitCropMode(false));

        let isDrawing = false;
        let startX, startY;
        if (canvasContainer) {
          canvasContainer.addEventListener("mousedown", (e) => {
            if (!isCropping || !currentImage) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            startX = (e.clientX - rect.left) * scaleX;
            startY = (e.clientY - rect.top) * scaleY;
            isDrawing = true;
            cropSelection.style.display = "block";
            cropActions.classList.add("hidden"); 
            cropSelection.style.left = `${e.clientX - rect.left}px`;
            cropSelection.style.top = `${e.clientY - rect.top}px`;
            cropSelection.style.width = "0px";
            cropSelection.style.height = "0px";
          });

          canvasContainer.addEventListener("mousemove", (e) => {
            if (!isCropping || !isDrawing || !currentImage) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const currentX = (e.clientX - rect.left) * scaleX;
            const currentY = (e.clientY - rect.top) * scaleY;
            const containerRect = canvasContainer.getBoundingClientRect();
            const startLeft = startX / scaleX + rect.left - containerRect.left;
            const startTop = startY / scaleY + rect.top - containerRect.top;
            const mouseLeft = e.clientX - containerRect.left;
            const mouseTop = e.clientY - containerRect.top;

            const selWidth = Math.abs(mouseLeft - startLeft);
            const selHeight = Math.abs(mouseTop - startTop);

            cropSelection.style.left = `${Math.min(startLeft, mouseLeft)}px`;
            cropSelection.style.top = `${Math.min(startTop, mouseTop)}px`;
            cropSelection.style.width = `${selWidth}px`;
            cropSelection.style.height = `${selHeight}px`;

            const width = currentX - startX;
            const height = currentY - startY;
            cropRect = {
              x: Math.min(startX, currentX),
              y: Math.min(startY, currentY),
              width: Math.abs(width),
              height: Math.abs(height),
            };
          });

          canvasContainer.addEventListener("mouseup", () => {
            if (!isCropping || !isDrawing) return;
            isDrawing = false;
            if (cropRect.width > 5 && cropRect.height > 5) {
                cropActions.classList.remove("hidden");
            }
          });
        }

        if (resetButton) {
          resetButton.addEventListener("click", () => {
            resetAllEdits();
          });
        }

        if (downloadButton) {
          downloadButton.addEventListener("click", () => {
            if (!currentImage) {
              updateStatus("Please load an image first.");
              return;
            }
            updateStatus("Preparing image for download...");
            try {
              const downloadCanvas = document.createElement("canvas");
              const downloadCtx = downloadCanvas.getContext("2d");
              downloadCanvas.width = canvas.width;
              downloadCanvas.height = canvas.height;
              
              downloadCtx.filter = buildFilterString();
              
              downloadCtx.drawImage(canvas, 0, 0);

              const link = document.createElement("a");
              link.download = "edited-image.png";
              link.href = downloadCanvas.toDataURL("image/png");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              updateStatus("Download started!");
            } catch (error) {
              console.error("Download error:", error);
              updateStatus("Error trying to download the image.");
            }
          });
        }

        window.addEventListener("resize", () => {
          if (currentImage) {
            drawImageOnCanvas();
          }
        });
      });