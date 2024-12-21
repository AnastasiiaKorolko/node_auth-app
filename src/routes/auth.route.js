const express = require('express');
const authController = require('../controllers/auth.controller.js');
const catchError = require('../utils/catchError.js');

const authRouter = new express.Router();

authRouter.post('/registration', catchError(authController.register));

authRouter.get(
  '/activation/:activationToken',
  catchError(authController.activate),
);
authRouter.post('/login', catchError(authController.login));
authRouter.get('/refresh', catchError(authController.refresh));
authRouter.post('/logout', catchError(authController.logout));
authRouter.get('/password-reset', catchError(authController.passwordReset));
authRouter.post('/reset-password', catchError(authController.resetPassword));


module.exports = { authRouter };