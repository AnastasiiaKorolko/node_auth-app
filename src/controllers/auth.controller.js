const { User } = require("../models/user");
const userService = require('../services/user.service.js');
const jwtService = require('../services/jwt.service.js');
const ApiError = require("../exeptions/api.error");
const bcrypt = require('bcrypt');
const tokenService = require('../services/token.service.js');
const emailService = require('../services/email.service.js');
const sendResetEmail = require('../services/resetEmail.services.js');
const { Token } = require("../models/token");

function validateEmail(value) {
  if (!value) {
    return 'Email is required';
  }

  const emailPattern = /^[\w.+-]+@([\w-]+\.){1,3}[\w-]{2,}$/;

  if (!emailPattern.test(value)) {
    return 'Email is not valid';
  }
}

function validatePassword(value) {
  if (!value) {
    return 'Password is required';
  }

  if (value.length < 6) {
    return 'At least 6 characters';
  }
}

const register = async (req, res, next) => {
  const { name, email, password, } = req.body;

  const errors = {
    email: validateEmail(email),
    password: validatePassword(password)
  }

  if (errors.email || errors.password) {
    throw ApiError.badRequest('Bad request', errors)
  }

  const hashedPass = await bcrypt.hash(password, 10)

  await userService.register(name, email, hashedPass)

  res.send({ message: 'OK' });

}

const activate = async (req, res) => {
  const { activationToken } = req.params;
  const user = await User.findOne({ where: { activationToken }})

  if (!user) {
    res.sendStatus(404);
    return;
  }

  user.activationToken = null;
  user.save();

  res.send(user);

}

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await userService.findByEmail(email);

  if (!user) {
    throw ApiError.badRequest('No such user')
  }

  await generateToken(res, user);

}

const refresh = (req, res) => {
  const { refreshToken } = req.cookies;

  const userData = jwtService.verifyRefresh(refreshToken);
  const token = await tokenService.getByToken(refreshToken)

  if (!userData || !token) {
    throw ApiError.unauthorized();
    return;
  }

  const user = await userService.findByEmail(userData.email)
  await generateToken(res, user);

}

const logout = async (req, res) => {
  const { refreshToken } = req.cookies;
  const userData = await jwtService.verifyRefresh(refreshToken);

  if (!userData || !refreshToken) {
    throw ApiError.unauthorized();
    return;
  }

  await tokenService.remove(userData.id);

  res.sendStatus(204);

}

const passwordReset = async (req, res) => {
  const { email } = req.body;
  const user = await User.findByEmail(email);

  if (!user) {
    throw ApiError.unauthorized('User with that email does not exist');
  }

  const resetToken = jwtService.sign(user);
  await emailService.sendResetEmail(user.email, resetToken);


}

const generateToken = async (res, user) => {
  const normalizedUser = userService.normalize(user);

  const accessToken = jwtService.sign(normalizedUser);
  const refreshAccessToken = jwtService.signRefresh(normalizedUser);

  await tokenService.save(normalizedUser.id, refreshAccessToken)

  res.cookie('refreshAccessToken', refreshAccessToken, {
    maxAge: 30 * 24 * 60 * 1000,
    HttpOnly: true
  })

  res.send({
    user: normalizedUser,
    accessToken
  })
}

module.exports = {
  register,
  activate,
  login,
  refresh,
  generateToken,
  logout

}
