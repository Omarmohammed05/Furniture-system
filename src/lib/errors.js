export class ValidationError extends Error {
  constructor(errors, message = 'راجع البيانات المدخلة') {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors || {}
  }
}

export function assertValid(errors) {
  if (errors && Object.keys(errors).length) {
    throw new ValidationError(errors)
  }
}
