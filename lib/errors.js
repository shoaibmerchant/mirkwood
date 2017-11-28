import { createError } from 'apollo-errors';

const UnknownError = createError('UnknownError', {
  message: 'An unknown error has occurred!  Please try again later'
});

const ForbiddenError = createError('ForbiddenError', {
  message: 'You are not allowed to do this'
});

const AuthenticationRequiredError = createError('AuthenticationRequiredError', {
  message: 'You must be logged in to do this'
});

const TypeNotFoundError = createError('TypeNotFound', { message: 'Type not found, please check name'});

export { UnknownError, ForbiddenError, AuthenticationRequiredError, TypeNotFoundError };
