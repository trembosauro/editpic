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
  const flipHorizontalButton = document.getElementById("flipHorizontalButton");
  const flipVerticalButton = document.getElementById("flipVerticalButton");
  const cropSelection = document.getElementById("cropSelection");
  const resetButton = document.getElementById("resetButton");
  const cropActions = document.getElementById("crop-actions");
  const confirmCrop = document.getElementById("confirmCrop");
  const cancelCrop = document.getElementById("cancelCrop");

  const drawModeButton = document.getElementById("drawModeButton");
  const brushSizeSlider = document.getElementById("brushSize");
  const undoButton = document.getElementById("undoButton");
  const redoButton = document.getElementById("redoButton");
  const lightnessSlider = document.getElementById("lightnessSlider");

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
    highlight: 0,
    shadow: 0,
    sharpen: 0,
    unblur: 0,
    denoise: 0,
  };
  let isCropping = false;
  let cropStartX, cropStartY;
  let cropRect = { x: 0, y: 0, width: 0, height: 0 };

  let isDrawingMode = false;
  let baseDrawingColor = "#00BCD4";
  let drawingColor = baseDrawingColor;
  let brushSize = 5;
  let drawnStrokes = [];
  let redoStrokes = [];
  let isDrawingStroke = false;

  function buildFilterString() {
    let filter = `brightness(${filterSettings.exposure}%) contrast(${filterSettings.contrast}%) saturate(${filterSettings.saturation}%)`;
    if (filterSettings.blur > 0) {
      filter += ` blur(${filterSettings.blur}px)`;
    }
    return filter;
  }

  function applySharpenFilter(imageData, amount) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const outputData = new Uint8ClampedArray(data);

    const kernel = [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ];

    const factor = amount / 100;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0,
          g = 0,
          b = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
            const weight = kernel[ky + 1][kx + 1];
            r += outputData[pixelIndex] * weight;
            g += outputData[pixelIndex + 1] * weight;
            b += outputData[pixelIndex + 2] * weight;
          }
        }
        const i = (y * width + x) * 4;
        data[i] = outputData[i] + (r - outputData[i]) * factor;
        data[i + 1] = outputData[i + 1] + (g - outputData[i + 1]) * factor;
        data[i + 2] = outputData[i + 2] + (b - outputData[i + 2]) * factor;
      }
    }
  }

  function applyDenoiseFilter(imageData, amount) {
    if (amount === 0) return;
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const outputData = new Uint8ClampedArray(data);
    const radius = Math.floor(amount / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0,
          count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const i = (ny * width + nx) * 4;
              r += outputData[i];
              g += outputData[i + 1];
              b += outputData[i + 2];
              count++;
            }
          }
        }
        const i = (y * width + x) * 4;
        data[i] = r / count;
        data[i + 1] = g / count;
        data[i + 2] = b / count;
      }
    }
  }

  function applyPixelFilters(imageData) {
    const data = imageData.data;
    const highlight = filterSettings.highlight;
    const shadow = filterSettings.shadow;
    const sharpen = filterSettings.sharpen;
    const unblur = filterSettings.unblur;
    const denoise = filterSettings.denoise;

    if (
      highlight === 0 &&
      shadow === 0 &&
      sharpen === 0 &&
      unblur === 0 &&
      denoise === 0
    ) {
      return;
    }

    if (denoise > 0) {
      // Only apply if value is set
      applyDenoiseFilter(imageData, denoise);
    }

    const sharpenAmount = Math.max(sharpen, unblur);
    if (sharpenAmount > 0) {
      applySharpenFilter(imageData, sharpenAmount);
    }

    applyHighlightShadow(imageData, highlight, shadow);
  }

  function applyHighlightShadow(imageData, highlight, shadow) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (highlight !== 0) {
        const factor = highlight / 100;
        r = r + (255 - r) * factor;
        g = g + (255 - g) * factor;
        b = b + (255 - b) * factor;
      }

      if (shadow !== 0) {
        const factor = shadow / 100;
        r = r * (1 + factor);
        g = g * (1 + factor);
        b = b * (1 + factor);
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
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

    if (
      filterSettings.highlight !== 0 ||
      filterSettings.shadow !== 0 ||
      filterSettings.sharpen > 0 ||
      filterSettings.unblur > 0 ||
      filterSettings.denoise > 0
    ) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyPixelFilters(imageData);
      ctx.putImageData(imageData, 0, 0);
    }

    applyCssFilters();

    redrawStrokes();
  }
  function redrawStrokes() {
    drawnStrokes.forEach((stroke) => {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    });
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
    if (drawModeButton) drawModeButton.disabled = !enabled;
    if (brushSizeSlider) brushSizeSlider.disabled = !enabled; // Brush size slider
    if (undoButton) undoButton.disabled = !enabled; // Undo button
    if (redoButton) redoButton.disabled = !enabled; // Redo button
    if (lightnessSlider) lightnessSlider.disabled = !enabled; // Lightness slider

    const colorSwatches = document.querySelectorAll(".color-swatch");
    colorSwatches.forEach((swatch) => (swatch.disabled = !enabled));

    if (changeImageButton)
      changeImageButton.style.display = enabled ? "flex" : "none";

    if (!enabled) {
      if (isDrawingMode) toggleDrawingMode(); // This will hide drawing-options
    }

    if (resetButton) resetButton.disabled = !enabled;
    if (downloadButton) downloadButton.disabled = !enabled;
    updateUndoRedoState();
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

  document
    .querySelectorAll("#highlight, #shadow, #sharpen, #unblur, #denoise")
    .forEach((slider) => {
      if (slider) {
        slider.addEventListener("input", (e) => {
          const id = e.target.id;
          filterSettings[id] = parseInt(e.target.value);
          drawImageOnCanvas();
        });
      }
    });

  if (drawModeButton) {
    drawModeButton.addEventListener("click", () => {
      toggleDrawingMode();
      const drawingOptions = document.getElementById("drawing-options");
      if (drawingOptions) {
        drawingOptions.style.display = isDrawingMode ? "flex" : "none";
      }
    });
  }

  function hexToRgb(hex) {
    let r = 0,
      g = 0,
      b = 0;
    if (hex.length == 4) {
      r = "0x" + hex[1] + hex[1];
      g = "0x" + hex[2] + hex[2];
      b = "0x" + hex[3] + hex[3];
    } else if (hex.length == 7) {
      r = "0x" + hex[1] + hex[2];
      g = "0x" + hex[3] + hex[4];
      b = "0x" + hex[5] + hex[6];
    }
    return { r: +r, g: +g, b: +b };
  }

  function rgbToHex(r, g, b) {
    r = Math.round(r).toString(16);
    g = Math.round(g).toString(16);
    b = Math.round(b).toString(16);
    if (r.length == 1) r = "0" + r;
    if (g.length == 1) g = "0" + g;
    if (b.length == 1) b = "0" + b;
    return "#" + r + g + b;
  }

  function adjustLightness(hex, percent) {
    const { r, g, b } = hexToRgb(hex);
    const amount = (percent / 100) * 255;
    const newR = Math.max(0, Math.min(255, r + amount));
    const newG = Math.max(0, Math.min(255, g + amount));
    const newB = Math.max(0, Math.min(255, b + amount));
    return rgbToHex(newR, newG, newB);
  }

  const colorSwatches = document.querySelectorAll(".color-swatch");
  colorSwatches.forEach((swatch) => {
    swatch.addEventListener("click", () => {
      baseDrawingColor = swatch.dataset.color;
      document.getElementById("lightnessSlider").value = 0;
      drawingColor = baseDrawingColor;

      colorSwatches.forEach((s) => s.classList.remove("border-primary"));
      swatch.classList.add("border-primary");
    });
  });

  if (lightnessSlider) {
    lightnessSlider.addEventListener("input", (e) => {
      drawingColor = adjustLightness(
        baseDrawingColor,
        parseInt(e.target.value)
      );
    });
  }

  function updateUndoRedoState() {
    if (undoButton) undoButton.disabled = drawnStrokes.length === 0;
    if (redoButton) redoButton.disabled = redoStrokes.length === 0;
  }

  if (undoButton) {
    undoButton.addEventListener("click", () => {
      if (drawnStrokes.length > 0) {
        const lastStroke = drawnStrokes.pop();
        redoStrokes.push(lastStroke);
        drawImageOnCanvas();
        updateUndoRedoState();
      }
    });
  }

  if (redoButton) {
    redoButton.addEventListener("click", () => {
      if (redoStrokes.length > 0) {
        const strokeToRedo = redoStrokes.pop();
        drawnStrokes.push(strokeToRedo);
        drawImageOnCanvas();
        updateUndoRedoState();
      }
    });
  }

  const initialDrawingOptions = document.getElementById("drawing-options");
  if (initialDrawingOptions) {
    initialDrawingOptions.style.display = "none";
  }
  const firstSwatch = document.querySelector(".color-swatch");
  if (firstSwatch) {
    firstSwatch.classList.add("border-primary");
  }
  if (brushSizeSlider) {
    brushSizeSlider.addEventListener("input", (e) => {
      brushSize = parseInt(e.target.value);
    });
  }

  function hideAllSliders() {
    sliderWrappers.forEach((wrapper) => {
      wrapper.classList.remove("active-control");
      const slider = wrapper.querySelector(".adjustable-slider");
      if (slider) {
        slider.classList.add("hidden");
      }
    });
  }

  const sliderWrappers = document.querySelectorAll(".slider-control-wrapper");
  sliderWrappers.forEach((wrapper) => {
    const label = wrapper.querySelector("label");
    const slider = wrapper.querySelector(".adjustable-slider");

    if (label && slider) {
      label.addEventListener("click", () => {
        const isCurrentlyActive = wrapper.classList.contains("active-control");

        hideAllSliders();

        if (!isCurrentlyActive) {
          wrapper.classList.add("active-control");
          slider.classList.remove("hidden");

          // Deactivate other tools
          if (isDrawingMode) toggleDrawingMode();
          if (isCropping) exitCropMode(false);
        }
      });
    }
  });

  function toggleDrawingMode() {
    isDrawingMode = !isDrawingMode;
    if (isDrawingMode) {
      drawModeButton.classList.add("active-transform-button");
      if (isCropping) exitCropMode(false);
      hideAllSliders();
      canvas.style.cursor = "crosshair";
      const drawingOptions = document.getElementById("drawing-options");
      if (drawingOptions) drawingOptions.style.display = "flex";
      updateStatus("Drawing mode activated.");
    } else {
      drawModeButton.classList.remove("active-transform-button");
      canvas.style.cursor = "default";
      const drawingOptions = document.getElementById("drawing-options");
      if (drawingOptions) drawingOptions.style.display = "none";
      updateStatus("Drawing mode deactivated.");
    }

    if (currentImage && canvas.classList.contains("hidden")) {
      canvas.classList.remove("hidden");
    }
  }

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
      if (isDrawingMode) toggleDrawingMode();
      if (!currentImage) return;
      rotationAngle = (rotationAngle + 90) % 360;
      redrawImageWithTransformations();
      updateStatus(`Image rotated to ${rotationAngle}°`);
    });
  }

  if (flipHorizontalButton) {
    flipHorizontalButton.addEventListener("click", () => {
      if (isCropping) exitCropMode(false);
      if (isDrawingMode) toggleDrawingMode();
      if (!currentImage) return;
      flipH *= -1;
      redrawImageWithTransformations();
      updateStatus(
        flipH === -1 ? "Image flipped horizontally" : "Horizontal flip removed"
      );
    });
  }

  if (flipVerticalButton) {
    flipVerticalButton.addEventListener("click", () => {
      if (isCropping) exitCropMode(false);
      if (isDrawingMode) toggleDrawingMode();
      if (!currentImage) return;
      flipV *= -1;
      redrawImageWithTransformations();
      updateStatus(
        flipV === -1 ? "Image flipped vertically" : "Vertical flip removed"
      );
    });
  }

  function resetAllEdits(isNewImage = false) {
    if (!originalImage && !isNewImage) return;

    document.getElementById("exposure").value = 100;
    document.getElementById("contrast").value = 100;
    document.getElementById("saturation").value = 100;
    document.getElementById("blur").value = 0;
    document.getElementById("highlight").value = 0;
    document.getElementById("shadow").value = 0;
    document.getElementById("sharpen").value = 0;
    document.getElementById("unblur").value = 0;
    document.getElementById("denoise").value = 0;

    Object.assign(filterSettings, {
      exposure: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      highlight: 0,
      shadow: 0,
      sharpen: 0,
      unblur: 0,
      denoise: 0,
    });

    rotationAngle = 0;
    flipH = 1;
    flipV = 1;
    drawnStrokes = [];
    redoStrokes = [];

    exitCropMode(false);
    if (isDrawingMode) toggleDrawingMode();
    hideAllSliders();

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
      updateUndoRedoState();
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
    if (isCropping) hideAllSliders(); // Hide sliders when exiting crop mode
    isCropping = false;
    cropActions.classList.add("hidden");
    cropSelection.style.display = "none";
    cropButton.classList.remove("active-transform-button");
    if (!isDrawingMode) {
      canvas.style.cursor = "default";
    }
  }

  if (cropButton) {
    cropButton.addEventListener("click", () => {
      if (!currentImage) return;
      if (isDrawingMode) toggleDrawingMode();
      hideAllSliders();
      if (isCropping) return;
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
      if (!currentImage) return;

      if (isDrawingMode) {
        isDrawingStroke = true;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        currentStroke = {
          color: drawingColor,
          size: brushSize,
          points: [{ x, y }],
        };
        drawnStrokes.push(currentStroke);
        redoStrokes = []; // Clear redo history on new stroke
        updateUndoRedoState();
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else if (isCropping) {
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
      }
    });

    canvasContainer.addEventListener("mousemove", (e) => {
      if (!currentImage) return;

      if (isDrawingMode && isDrawingStroke) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        currentStroke.points.push({ x, y });
        ctx.lineTo(x, y);
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.stroke();
      } else if (isCropping && isDrawing) {
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
      }
    });

    canvasContainer.addEventListener("mouseup", () => {
      if (!currentImage) return;

      if (isDrawingMode && isDrawingStroke) {
        isDrawingStroke = false;
        ctx.closePath();
        drawImageOnCanvas(); // Redraw the entire canvas to bake in the new stroke with filters
      } else if (isCropping && isDrawing) {
        isDrawing = false;
        if (cropRect.width > 5 && cropRect.height > 5) {
          cropActions.classList.remove("hidden");
        }
      }
    });

    canvasContainer.addEventListener("mouseleave", () => {
      if (isDrawingMode && isDrawingStroke) {
        isDrawingStroke = false;
        ctx.closePath();
        drawImageOnCanvas();
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

        downloadCtx.save();
        downloadCtx.translate(
          downloadCanvas.width / 2,
          downloadCanvas.height / 2
        );
        downloadCtx.scale(flipH, flipV);
        downloadCtx.rotate((rotationAngle * Math.PI) / 180);
        downloadCtx.drawImage(
          currentImage,
          -currentImage.width / 2,
          -currentImage.height / 2
        );
        downloadCtx.restore();

        const imageData = downloadCtx.getImageData(
          0,
          0,
          downloadCanvas.width,
          downloadCanvas.height
        );
        applyPixelFilters(imageData);
        downloadCtx.putImageData(imageData, 0, 0);

        downloadCtx.filter = buildFilterString();
        downloadCtx.drawImage(downloadCanvas, 0, 0);

        drawnStrokes.forEach((stroke) => {
          downloadCtx.beginPath();
          downloadCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            downloadCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          downloadCtx.strokeStyle = stroke.color;
          downloadCtx.lineWidth = stroke.size;
          downloadCtx.lineCap = "round";
          downloadCtx.lineJoin = "round";
          downloadCtx.stroke();
        });

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
