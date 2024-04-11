/**
 * Utilities for WebGL contexts
 */
export class WebGLUtils {
  context: WebGLRenderingContext;

  constructor(context: WebGLRenderingContext) {
    this.context = context;
  }

  /**
   * Create WebGL texture
   *
   * Originates from Pxls
   *
   * @returns WebGL texture
   */
  createTexture() {
    const texture = this.context.createTexture();
    this.context.bindTexture(this.context.TEXTURE_2D, texture);
    this.context.texParameteri(
      this.context.TEXTURE_2D,
      this.context.TEXTURE_WRAP_S,
      this.context.CLAMP_TO_EDGE
    );
    this.context.texParameteri(
      this.context.TEXTURE_2D,
      this.context.TEXTURE_WRAP_T,
      this.context.CLAMP_TO_EDGE
    );
    this.context.texParameteri(
      this.context.TEXTURE_2D,
      this.context.TEXTURE_MIN_FILTER,
      this.context.NEAREST
    );
    this.context.texParameteri(
      this.context.TEXTURE_2D,
      this.context.TEXTURE_MAG_FILTER,
      this.context.NEAREST
    );
    return texture;
  }

  /**
   * Create WebGL program
   *
   * Originates from Pxls
   *
   * @param vertexSource
   * @param fragmentSource
   * @returns WebGL program
   */
  createProgram(vertexSource: string, fragmentSource: string) {
    // i believe null is only returned when webgl context is destroyed?
    // maybe add proper handling here
    const program = this.context.createProgram()!;
    this.context.attachShader(
      program,
      this.createShader(this.context.VERTEX_SHADER, vertexSource)
    );
    this.context.attachShader(
      program,
      this.createShader(this.context.FRAGMENT_SHADER, fragmentSource)
    );
    this.context.linkProgram(program);
    if (!this.context.getProgramParameter(program, this.context.LINK_STATUS)) {
      throw new Error(
        `Failed to link WebGL template program:\n\n${this.context.getProgramInfoLog(program)}`
      );
    }
    return program;
  }

  /**
   * Create WebGL shader
   *
   * Originates from Pxls
   *
   * @param type
   * @param source
   * @returns WebGL shader
   */
  createShader(type: number, source: string) {
    // i believe null is only returned when webgl context is destroyed?
    // maybe add proper handling here
    const shader = this.context.createShader(type)!;

    this.context.shaderSource(shader, source);
    this.context.compileShader(shader);

    if (!this.context.getShaderParameter(shader, this.context.COMPILE_STATUS)) {
      throw new Error(
        `Failed to compile WebGL template shader:\n\n${this.context.getShaderInfoLog(shader)}`
      );
    }

    return shader;
  }
}
