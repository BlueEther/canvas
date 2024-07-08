import EventEmitter from "eventemitter3";
import { WebGLUtils } from "./webgl";
import { ClientConfig } from "@sc07-canvas/lib/src/net";
import { rgbToHex } from "./utils";

interface TemplateEvents {
  updateImageURL(url: string | undefined): void;
  option<T extends keyof ITemplateOptions>(
    option: T,
    value: ITemplateOptions[T]
  ): void;
  autoDetectWidth(width: number): void;
}

interface ITemplateOptions {
  enable: boolean;
  width?: number;
  style: keyof typeof TemplateStyle;
}

const TemplateStyle = {
  SOURCE: "",
  ONE_TO_ONE:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGklEQVQoz2P8//8/AymAiYFEMKphVMPQ0QAAVW0DHZ8uFaIAAAAASUVORK5CYII=",
  ONE_TO_ONE_INCORRECT:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGklEQVQoz2P8//8/AymAiYFEMKphVMPQ0QAAVW0DHZ8uFaIAAAAASUVORK5CYII=",
  DOTTED_SMALL:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAD9CzEMAAAAAmJLR0QA/4ePzL8AAAAzSURBVFjD7dBBDQAACMSw828aVEAI6R4T0GShGv6DECFChAgRIkSIECFChAgRIkSIruA0nub+AuTzLZoAAAAASUVORK5CYII=",
  DOTTED_BIG:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAWklEQVR42u3UwQkAIAwEwcX+e9aP2INkBvK4d2CLqva9cXv5PWgAoAGgARoAGqABoAEaABqgAaABGgAaoAGgARoAGqABoAEaABqgAaABGgAaoAGgAT/vRwOmO8dS/DI1VxCbAAAAAElFTkSuQmCC",
  SYMBOLS:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAABwAQMAAAD8LmYIAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAAZQTFRFAAAAAwMDFQUF7wAAAAJ0Uk5TAP9bkSK1AAAAuUlEQVR4nGNgQAUhjQvdz0uwMfx82OrVIgPkBj/xaOEQ6GRuP9vHAeQGsPjzyVj8LH5+iAXEDTziMd+uplHg+VE+GQaNjwHt5+WB3A+HO+bbMRACDoed+Xg0FIMW97dIMLAwNC45OF8ip+Dh8aN8Ngwsjc2sXfNFBAoePz8xX46B5+DhNj4WlpwCx+NH5W0Yan5+fn6+xU5DwWlxf58EAWs0DFC4NQX4uBaoXAFUvaNgFIyCUTAKaAYAzI49GM5w0hQAAAAOZVhJZk1NACoAAAAIAAAAAAAAANJTkwAAAABJRU5ErkJggg==",
  NUMBERS:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALAAAACwCAYAAACvt+ReAAAE10lEQVR42u3d3bKjKBQGULDy/q/MXE1VdzqRH9kqZq2bqZn5JKAmErbm5JRSSbCw0pGTlb1VdttpoAS9AUpANgW1u0q2dGxTOo7faLu92TTa7vZlozz55P2/zRyQ7RXRj97+zsyWjm1GT97aGI9kR8aWaydwxIEg7g05ms0nvcnCsq8bzrVnvVNr2RyQzReP7eeO33bBp0We/E6NnJr0nJAR7UZOpR5x/LYEC9smrCyMrETMXErpvazd4fI9c3+VnW/2teze8Ss7qwAt7ZYJ50y13deqk/fBbVYb28iY8mLZvf9ebTcnlTgeOIWAZShJyi6bfX3YOH84sfOXF7oyW3amQrXs++vMarc3m7/048w+rJT957htlU/i3HCQ93J77R7N5o4vD+/ZUvmSkRvHdiSbOvqwt/2RbA7av6cdt+0Bqw8jlMDX9M9xq5WS71xKjS5VtmxbDvZ3JJsDsvnEsU09dq+GM75MPnl72s2VQZx1JehdA23pb8/YevdDax/KhWMrM84Vy2gs7dOXuJGSZMslYLTUWbsUtbT7nm25ibqlhPqp3Z7+po7+RuyHnj707t/S8fql8/XLyHzE2qPs7bJKyTxmCgFLcimSXTa7fdiwfPn3NDGbgtq9ezYNZke++JaAbApqdzj75zrw+9rd3lrekeye1vsljmZ7+5snZL/1q2clJw3uwxnZXlGPWP3VX3PgNSh9f/HaeaeXzk+FEpzNAdl88dhSQPanjttWeafX7lZq/ZRovQPqSLanDyWo3ci70XqyvXeutbQbeVdez91onkrmmVOII3c1RV02I+8Ei2g36sc/SuOVo+WSfKS/EdOfw/2wnii7bFYpmaWZA7M8lyLZZbOvD0sUf/4z7XyJ68n++f88PfyDTw9H9WHWI0W17JFHXmqv+WnHzcymjj7Utj2yvpwC9u/yx+3uc2Al1DWddtxelfnw7DJjxI9Kt14pSuM7flY2B2TzxWO73XF7/12IM8qMtXeuEmpDCfWEsR2dSvVOu4ZuWbCMxtJaf9gkHcjNKM3WVgBqlzGl7/7+HhlfrfQ9ejdaOXqSysreKquUzNLMgVmeS5Hsstlv9wMroY5lW7+4KH1Pyr6vQiihHnsquTSMy1Pf4/v3n6w58FxK3yf7VkpWQo35M7Ol4xPzvd0SnM0B2Rw9tq1y+f7Fp4fPOHlr/SgdYysHxta7H3pOyIh2/a1kfmMK0fqJ0rrd3Uq5nh6O3Q8peP8Obywre6usUjJLMwdmeS5Fsstma6Xkb8scSqjPyC5/3Fp+nfKbI0+hRq0vp45s72MsOaC/V2eXP26z5sBKqGta/rjNWgfuyfrh7Pix/cxx2w68Iy95CvWiS5wfzt7f/rKnvi2j8egpxC2fQr355TCiXU9972xrPVF22axSMo+aQkCUsCU7lyLZM7Lhn8BKqOf39xdL31PN+kOHSqhj+yF1ju0ppe+wE9h8jKW/xK1WQj1D5GM3I9mIH5vOF49tyifwij/AfOYndk8JNqLNiDJ/CWr3tOOmlMxjphB+gPn4VErp+4Jpn3VK2TOyYXM7pWTO+h4BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE/1H4IIqRgL4W2oAAAAAElFTkSuQmCC",
};

export type TemplateStyle = keyof typeof TemplateStyle;

const STYLES_Y = 16;
const STYLES_X = 16;

export class Template extends EventEmitter<TemplateEvents> {
  static instance: Template;

  config: ClientConfig;

  $wrapper: HTMLDivElement;
  $imageLoader: HTMLImageElement;
  $style: HTMLImageElement;
  $canvas: HTMLCanvasElement;
  imageURL: string | undefined;

  options: ITemplateOptions = {
    enable: false,
    style: "ONE_TO_ONE",
  };

  constructor(config: ClientConfig, templateHolder: HTMLDivElement) {
    super();
    Template.instance = this;
    this.config = config;

    // @ts-ignore
    window.TEST_TEMPLATE = this;

    console.log("[Template] Initialize", config, templateHolder);

    this.$wrapper = templateHolder;

    this.$imageLoader = document.createElement("img");
    this.$imageLoader.style.setProperty("display", "none");
    this.$imageLoader.setAttribute("crossorigin", "");
    this.$imageLoader.addEventListener("load", () => {
      console.log("[Template] Image loaded");
      if (!this.options.width) {
        this.setOption("width", this.$imageLoader.naturalWidth);
        this.emit("autoDetectWidth", this.$imageLoader.naturalWidth);
      }
      this.rasterizeTemplate();
    });

    this.$style = document.createElement("img");
    this.$style.setAttribute("crossorigin", "");
    this.$style.setAttribute("src", TemplateStyle[this.options!.style]);
    this.$style.addEventListener("load", () => {
      console.log("[Template] Style loaded");
      this.loadStyle();
    });

    this.$canvas = document.createElement("canvas");

    [this.$imageLoader, this.$style, this.$canvas].forEach((el) =>
      el.classList.add("pixelate")
    );

    templateHolder.style.width = this.options!.width + "px";
    templateHolder.appendChild(this.$imageLoader);
    // templateHolder.appendChild(this.$style);
    templateHolder.appendChild(this.$canvas);

    this.setupWebGL();
  }

  destroy() {
    this.$imageLoader.remove();
    this.$style.remove();
    this.$canvas.remove();
    this.removeAllListeners();
  }

  /**
   * Update settings
   *
   * NOTE: this does not cause re-render
   *
   * @param key
   * @param value
   */
  setOption<T extends keyof ITemplateOptions>(
    key: T,
    value: ITemplateOptions[T]
  ) {
    this.options[key] = value;

    switch (key) {
      case "enable":
        this.setElementVisible([this.$canvas], !!value);
        break;
      case "style":
        if ((value as keyof typeof TemplateStyle) in TemplateStyle) {
          const key = value as keyof typeof TemplateStyle;

          this.$style.setAttribute("src", TemplateStyle[key]);
          this.$imageLoader.style.display = key === "SOURCE" ? "block" : "none";

          if (key === "SOURCE") {
            this.stylizeTemplate();
          }
        }
        break;
    }

    this.emit("option", key, value);
  }

  setElementVisible(els: HTMLElement[], visible: boolean) {
    for (const el of els) {
      el.style.display = visible ? "block" : "none";
    }
  }

  getPixel(x: number, y: number): string | undefined {
    if (!this.context) {
      console.warn("[Template#getPixel] No context is available");
      return undefined;
    }

    const width = this.context.drawingBufferWidth;
    const height = this.context.drawingBufferHeight;

    const arr = new Uint8Array(4 * width * height);
    this.context.bindFramebuffer(
      this.context.FRAMEBUFFER,
      this.framebuffers.intermediate
    );

    if (x < 0 || y < 0 || x > width || y > height) {
      return undefined;
    }

    this.context.readPixels(
      0,
      0,
      width,
      height,
      this.context.RGBA,
      this.context.UNSIGNED_BYTE,
      arr
    );
    this.context.bindFramebuffer(
      this.context.FRAMEBUFFER,
      this.framebuffers.main
    );

    const pixels = new Uint8Array(4 * width * height);
    const length = width * height * 4;
    const row = width * 4;
    const end = (height - 1) * row;
    for (let i = 0; i < length; i += row) {
      pixels.set(arr.subarray(i, i + row), end - i);
    }

    const [r, g, b, a] = pixels.slice(
      4 * (y * this.context.drawingBufferWidth + x),
      4 * (y * this.context.drawingBufferWidth + x) + 4
    );

    if (a === 254) return undefined;

    return rgbToHex(r, g, b);
  }

  rasterizeTemplate() {
    this.downscaleTemplate();
    this.stylizeTemplate();
  }

  loadImage(url: string) {
    return fetch(url, { method: "GET", credentials: "omit" })
      .then((resp) => {
        if (resp.ok) {
          return resp.blob();
        } else {
          throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        }
      })
      .then((blob) => {
        return new Promise<void>((res) => {
          const reader = new FileReader();
          reader.onload = () => {
            // reader.result will be a string because of reader.readAsDataURL being called
            this.imageURL = reader.result as string;
            this.$imageLoader.setAttribute("src", this.imageURL);
            this.emit("updateImageURL", this.imageURL);
            res();
          };
          reader.readAsDataURL(blob);
        });
      })
      .catch((err) => {
        // TODO: Better error handling
        alert("template loadimage error: " + err);
      });
  }

  getDimentions() {
    let source = {
      width: this.$imageLoader.naturalWidth,
      height: this.$imageLoader.naturalHeight,
    };
    let style = {
      width: this.$style.naturalWidth / STYLES_X,
      height: this.$style.naturalHeight / STYLES_Y,
    };

    let aspectRatio = source.height / source.width;

    let display = {
      width: Math.round(this.options?.width || source.width),
      height: Math.round((this.options?.width || source.width) * aspectRatio),
    };
    let internal = {
      width: display.width * style.width,
      height: display.height * style.height,
    };

    return {
      source,
      style,
      display,
      internal,
      aspectRatio,
    };
  }

  private context: WebGLRenderingContext | undefined;

  private textures: {
    source: WebGLTexture | null;
    downscaled: WebGLTexture | null;
    style: WebGLTexture | null;
  } = {} as any;

  private framebuffers: {
    intermediate: WebGLFramebuffer | null;
    main: WebGLFramebuffer | null;
  } = {} as any;
  private buffers: { vertex: WebGLBuffer | null } = {} as any;
  private programs: {
    downscaling: { unconverted: WebGLProgram; nearestCustom: WebGLProgram };
    stylize: WebGLProgram;
  } = { downscaling: {} } as any;

  updateSize() {
    const { display, internal } = this.getDimentions();

    this.$wrapper.style.width = display.width + "px";
    this.$imageLoader.style.width = display.width + "px";
    this.$canvas.style.width = display.width + "px";

    this.$canvas.width = internal.width;
    this.$canvas.height = internal.height;
  }

  /**
   * Initialize webgl
   *
   * This originates from Pxls and their contributors
   * https://github.com/pxlsspace/pxls-web/blob/0c5a680c4611af277205886df77ac9014c759aba/public/include/template.js#L616
   */
  setupWebGL() {
    const palette: { value: string }[] = this.config.pallete.colors.map(
      (color) => ({ value: color.hex })
    );

    const context = this.$canvas.getContext("webgl", {
      premultipliedAlpha: true,
    });

    if (context === null) {
      throw new Error("WebGL is not supported");
    }

    this.context = context;

    const utils = new WebGLUtils(context);

    context.clearColor(0, 0, 0, 0);
    context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true);

    this.textures.source = utils.createTexture();
    this.textures.downscaled = utils.createTexture();
    this.framebuffers.intermediate = context.createFramebuffer();

    context.bindFramebuffer(
      context.FRAMEBUFFER,
      this.framebuffers.intermediate
    );
    context.framebufferTexture2D(
      context.FRAMEBUFFER,
      context.COLOR_ATTACHMENT0,
      context.TEXTURE_2D,
      this.textures.downscaled,
      0
    );

    this.textures.style = utils.createTexture();
    this.loadStyle(false);
    this.buffers.vertex = context.createBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, this.buffers.vertex);
    // prettier-ignore
    context.bufferData(
      context.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
        -1, 1,
        1, -1,
        1, 1
      ]),
      context.STATIC_DRAW
    );

    const identityVertexShader = `
        attribute vec2 a_Pos;
        varying vec2 v_TexCoord;
        void main() {
          v_TexCoord = a_Pos * vec2(0.5, 0.5) + vec2(0.5, 0.5);
          gl_Position = vec4(a_Pos, 0.0, 1.0);
        }
      `;
    const paletteDefs = `
        #define PALETTE_LENGTH ${palette.length}
        #define PALETTE_MAXSIZE 255.0
        #define PALETTE_TRANSPARENT (PALETTE_MAXSIZE - 1.0) / PALETTE_MAXSIZE
        #define PALETTE_UNKNOWN 1.0
      `;
    const diffCustom = `
        #define LUMA_WEIGHTS vec3(0.299, 0.587, 0.114)
        // a simple custom colorspace that stores:
        // - brightness
        // - red/green-ness
        // - blue/yellow-ness
        // this storing of contrasts is similar to how humans
        // see color difference and provides a simple difference function
        // with decent results.
        vec3 rgb2Custom(vec3 rgb) {
          return vec3(
            length(rgb * LUMA_WEIGHTS),
            rgb.r - rgb.g,
            rgb.b - (rgb.r + rgb.g) / 2.0
          );
        }
        float diffCustom(vec3 col1, vec3 col2) {
          return length(rgb2Custom(col1) - rgb2Custom(col2));
        }
      `;
    const downscalingFragmentShader = (comparisonFunctionName?: string) => `
        precision mediump float;
        // GLES (and thus WebGL) does not support dynamic for loops
        // the workaround is to specify the condition as an upper bound
        // then break the loop early if we reach our dynamic limit 
        #define MAX_SAMPLE_SIZE 16.0
        
        ${paletteDefs}
        ${comparisonFunctionName !== undefined ? "#define CONVERT_COLORS" : ""}
        #define HIGHEST_DIFF 999999.9
        uniform sampler2D u_Template;
        uniform vec2 u_TexelSize;
        uniform vec2 u_SampleSize;
        uniform vec3 u_Palette[PALETTE_LENGTH];
        varying vec2 v_TexCoord;
        const float epsilon = 1.0 / 128.0;
        // The alpha channel is used to index the palette: 
        const vec4 transparentColor = vec4(0.0, 0.0, 0.0, PALETTE_TRANSPARENT);
        ${diffCustom}
        void main () {
          vec4 color = vec4(0.0);
          vec2 actualSampleSize = min(u_SampleSize, vec2(MAX_SAMPLE_SIZE));
          vec2 sampleTexSize = u_TexelSize / actualSampleSize;
          // sample is taken from center of fragment
          // this moves the coordinates to the starting corner and to the center of the sample texel
          vec2 sampleOrigin = v_TexCoord - sampleTexSize * (actualSampleSize / 2.0 - 0.5);
          float sampleCount = 0.0;
          for(float x = 0.0; x < MAX_SAMPLE_SIZE; x++) {
            if(x >= u_SampleSize.x) {
              break;
            }
            for(float y = 0.0; y < MAX_SAMPLE_SIZE; y++) {
              if(y >= u_SampleSize.y) {
                break;
              }
              vec2 pos = sampleOrigin + sampleTexSize * vec2(x, y);
              vec4 sample = texture2D(u_Template, pos);
              // pxlsfiddle uses the alpha channel of the first pixel to store
              // scale information. This can affect color sampling, so drop the
              // top-left-most subtexel unless its alpha is typical (1 or 0 exactly).
              if(x == 0.0 && y == 0.0
                && pos.x < u_TexelSize.x && (1.0 - pos.y) < u_TexelSize.y
                && sample.a != 1.0) {
                continue;
              }
              if(sample.a == 0.0) {
                continue;
              }
              color += sample;
              sampleCount++;
            }
          }
          if(sampleCount == 0.0) {
            gl_FragColor = transparentColor;
            return;
          }
          color /= sampleCount;
          #ifdef CONVERT_COLORS
            float bestDiff = HIGHEST_DIFF;
            int bestIndex = int(PALETTE_MAXSIZE);
            vec3 bestColor = vec3(0.0);
            for(int i = 0; i < PALETTE_LENGTH; i++) {
              float diff = ${comparisonFunctionName}(color.rgb, u_Palette[i]);
              if(diff < bestDiff) {
                bestDiff = diff;
                bestIndex = i;
                bestColor = u_Palette[i];
              }
            }
            gl_FragColor = vec4(bestColor, float(bestIndex) / PALETTE_MAXSIZE);
          #else
            for(int i = 0; i < PALETTE_LENGTH; i++) {
              if(all(lessThan(abs(u_Palette[i] - color.rgb), vec3(epsilon)))) {
                gl_FragColor = vec4(u_Palette[i], float(i) / PALETTE_MAXSIZE);
                return;
              }
            }
            gl_FragColor = vec4(color.rgb, PALETTE_UNKNOWN);
          #endif
        }
      `;
    this.programs.downscaling.unconverted = utils.createProgram(
      identityVertexShader,
      downscalingFragmentShader()
    );
    this.programs.downscaling.nearestCustom = utils.createProgram(
      identityVertexShader,
      downscalingFragmentShader("diffCustom")
    );
    const int2rgb = (i: number) => [
      (i >> 16) & 0xff,
      (i >> 8) & 0xff,
      i & 0xff,
    ];
    const paletteBuffer = new Float32Array(
      palette.flatMap((c) => int2rgb(parseInt(c.value, 16)).map((c) => c / 255))
    );
    for (const program of Object.values(this.programs.downscaling)) {
      context.useProgram(program);
      const posLocation = context.getAttribLocation(program, "a_Pos");
      context.vertexAttribPointer(posLocation, 2, context.FLOAT, false, 0, 0);
      context.enableVertexAttribArray(posLocation);
      context.uniform1i(context.getUniformLocation(program, "u_Template"), 0);
      context.uniform3fv(
        context.getUniformLocation(program, "u_Palette"),
        paletteBuffer
      );
    }
    this.programs.stylize = utils.createProgram(
      identityVertexShader,
      `
        precision mediump float;
        #define STYLES_X float(${STYLES_X})
        #define STYLES_Y float(${STYLES_Y})
        ${paletteDefs}
        uniform sampler2D u_Template;
        uniform sampler2D u_Style;
        uniform vec2 u_TexelSize;
        varying vec2 v_TexCoord;
        const vec2 styleSize = vec2(1.0 / STYLES_X, 1.0 / STYLES_Y);
        void main () {
          vec4 templateSample = texture2D(u_Template, v_TexCoord);
          float index = floor(templateSample.a * PALETTE_MAXSIZE + 0.5);
          vec2 indexCoord = vec2(mod(index, STYLES_X), STYLES_Y - floor(index / STYLES_Y) - 1.0);
          vec2 subTexCoord = mod(v_TexCoord, u_TexelSize) / u_TexelSize;
          vec2 styleCoord = (indexCoord + subTexCoord) * styleSize;
          
          vec4 styleMask = vec4(1.0, 1.0, 1.0, texture2D(u_Style, styleCoord).a);
          gl_FragColor = vec4(templateSample.rgb, templateSample.a == PALETTE_TRANSPARENT ? 0.0 : 1.0) * styleMask;
        }
      `
    );
    context.useProgram(this.programs.stylize);
    const stylePosLocation = context.getAttribLocation(
      this.programs.stylize,
      "a_Pos"
    );
    context.vertexAttribPointer(
      stylePosLocation,
      2,
      context.FLOAT,
      false,
      0,
      0
    );
    context.enableVertexAttribArray(stylePosLocation);
    context.uniform1i(
      context.getUniformLocation(this.programs.stylize, "u_Template"),
      0
    );
    context.uniform1i(
      context.getUniformLocation(this.programs.stylize, "u_Style"),
      1
    );
  }

  loadStyle(redraw = true) {
    if (
      this.context &&
      this.$style.naturalWidth !== 0 &&
      this.$style.naturalHeight !== 0
    ) {
      this.context.activeTexture(this.context.TEXTURE1);
      this.context.bindTexture(this.context.TEXTURE_2D, this.textures.style);
      this.context.texImage2D(
        this.context.TEXTURE_2D,
        0,
        this.context.ALPHA,
        this.context.ALPHA,
        this.context.UNSIGNED_BYTE,
        this.$style
      );

      if (redraw) {
        this.stylizeTemplate();
      }
    }
  }

  downscaleTemplate() {
    const dimentions = this.getDimentions();
    const {
      display: { width, height },
    } = dimentions;
    if (!this.context || width === 0 || height === 0) return;

    const downscaleWidth = dimentions.source.width / dimentions.display.width;
    const downscaleHeight =
      dimentions.source.height / dimentions.display.height;

    // set size of framebuffer
    this.context.activeTexture(this.context.TEXTURE0);
    this.context.bindTexture(this.context.TEXTURE_2D, this.textures.downscaled);
    this.context.texImage2D(
      this.context.TEXTURE_2D,
      0,
      this.context.RGBA,
      width,
      height,
      0,
      this.context.RGBA,
      this.context.UNSIGNED_BYTE,
      null
    );

    this.context.bindFramebuffer(
      this.context.FRAMEBUFFER,
      this.framebuffers.intermediate
    );
    this.context.clear(this.context.COLOR_BUFFER_BIT);
    this.context.viewport(0, 0, width, height);

    const program = this.programs.downscaling.nearestCustom;

    this.context.useProgram(program);

    this.context.uniform2f(
      this.context.getUniformLocation(program, "u_SampleSize"),
      Math.max(1, downscaleWidth),
      Math.max(1, downscaleHeight)
    );
    this.context.uniform2f(
      this.context.getUniformLocation(program, "u_TexelSize"),
      1 / width,
      1 / height
    );

    this.context.bindTexture(this.context.TEXTURE_2D, this.textures.source);

    this.context.texImage2D(
      this.context.TEXTURE_2D,
      0,
      this.context.RGBA,
      this.context.RGBA,
      this.context.UNSIGNED_BYTE,
      this.$imageLoader
    );

    this.context.drawArrays(this.context.TRIANGLE_STRIP, 0, 4);
  }

  stylizeTemplate() {
    this.updateSize();

    const { internal, display } = this.getDimentions();

    if (this.context == null || internal.width === 0 || internal.height === 0) {
      return;
    }

    this.context.bindFramebuffer(
      this.context.FRAMEBUFFER,
      this.framebuffers.main
    );
    this.context.clear(this.context.COLOR_BUFFER_BIT);
    this.context.viewport(0, 0, internal.width, internal.height);

    this.context.useProgram(this.programs.stylize);

    this.context.uniform2f(
      this.context.getUniformLocation(this.programs.stylize, "u_TexelSize"),
      1 / display.width,
      1 / display.height
    );

    this.context.activeTexture(this.context.TEXTURE0);
    this.context.bindTexture(this.context.TEXTURE_2D, this.textures.downscaled);

    this.context.activeTexture(this.context.TEXTURE1);
    this.context.bindTexture(this.context.TEXTURE_2D, this.textures.style);

    this.context.drawArrays(this.context.TRIANGLE_STRIP, 0, 4);
  }
}
