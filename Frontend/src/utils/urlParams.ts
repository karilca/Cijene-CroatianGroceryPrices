// Utility for building URL search parameters consistently

export class URLParamsBuilder {
  private params: URLSearchParams;

  constructor() {
    this.params = new URLSearchParams();
  }

  /**
   * Add a parameter if the value is truthy
   */
  add(key: string, value: string | number | boolean | null | undefined): this {
    if (value !== null && value !== undefined && value !== '') {
      this.params.append(key, String(value));
    }
    return this;
  }

  /**
   * Add an array parameter as repeated values
   */
  addArray(key: string, values: string[] | null | undefined): this {
    if (values && values.length > 0) {
      values.forEach(value => {
        this.params.append(key, value);
      });
    }
    return this;
  }

  /**
   * Add pagination parameters with validation
   */
  addPagination(page?: number, perPage?: number, maxPerPage: number = 100): this {
    const validatedPage = Math.max(1, page || 1);
    const validatedPerPage = Math.min(maxPerPage, Math.max(1, perPage || 20));

    this.params.append('page', validatedPage.toString());
    this.params.append('per_page', validatedPerPage.toString());

    return this;
  }

  /**
   * Add coordinates if both are provided
   */
  addCoordinates(latitude?: number, longitude?: number): this {
    if (latitude !== undefined && longitude !== undefined) {
      this.params.append('latitude', latitude.toString());
      this.params.append('longitude', longitude.toString());
    }
    return this;
  }

  /**
   * Get the built URL search params
   */
  build(): URLSearchParams {
    return this.params;
  }

  /**
   * Get the built query string
   */
  toString(): string {
    return this.params.toString();
  }

  /**
   * Create a builder with common pagination defaults
   */
  static withPagination(page?: number, perPage?: number): URLParamsBuilder {
    return new URLParamsBuilder().addPagination(page, perPage);
  }
}