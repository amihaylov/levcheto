"use strict";

var debug = require('debug')('app:routes:default' + process.pid),
    _ = require("lodash"),
    util = require('util'),
    path = require('path'),
    bcrypt = require('bcryptjs'),
    utils = require("../utils.js"),
    Router = require("express").Router,
    UnauthorizedAccessError = require(path.join(__dirname, "..", "errors", "UnauthorizedAccessError.js")),
    BadRequestError = require(path.join(__dirname, "..", "errors", "BadRequestError.js")),
    GeneralServerError = require(path.join(__dirname, "..", "errors", "GeneralServerError.js")),
    NotFoundError = require(path.join(__dirname, "..", "errors", "NotFoundError.js")),
    User = require(path.join(__dirname, "..", "models", "user.js")),
    jwt = require("express-jwt"),
    mongoose_uri = process.env.MONGOOSE_URI || "localhost/express-jwt-auth";

var authenticate = function(req, res, next) {

    debug("Processing authenticate middleware");

    var username = req.body.username,
        password = req.body.password;

    if (_.isEmpty(username) || _.isEmpty(password)) {
        return next(new UnauthorizedAccessError("401", {
            message: 'Invalid username or password'
        }));
    }

    process.nextTick(function() {

        User.findOne({
            username: username
        }, function(err, user) {

            if (err || !user) {
                return next(new UnauthorizedAccessError("401", {
                    message: 'Invalid username or password'
                }));
            }
            comparePassword(password, function(err, isMatch) {
                if (isMatch && !err) {
                    debug("User authenticated, generating token");
                    utils.create(user, req, res, next);
                } else {
                    return next(new UnauthorizedAccessError("401", {
                        message: 'Invalid username or password'
                    }));
                }
            });
        });

    });


};

var createUser = function(req, res, next) {

    debug("Processing create user middleware");

    var username = req.body.username,
        password = req.body.password,
        email = req.body.email;

    if (_.isEmpty(username) || _.isEmpty(password) || _.isEmpty(email) || !utils.isEmail(email)) {
        return next(new BadRequestError("404", {
            message: 'Invalid username or password'
        }));
    } else {
        process.nextTick(function() {
            var user = new User();

            user.username = username;
            user.password = password;
            user.email = email;
            user.isAdmin = false;

            user.save(function(err) {
                if (err) {
                    console.log(err);
                    return next(new GeneralServerError("500", {
                        message: 'Mongo DB error: ' + err.message
                    }));
                } else {
                    console.log(user);
                    next();
                }
            });
        });
    }
};

var getAll = function(req, res, next) {
    debug("Processing get all users.");

    if (!req.isAdmin) {
        return next(new UnauthorizedAccessError("401", {
            message: 'Access Denied. Admin rights needed.'
        }));
    }
    process.nextTick(function() {
        User.find().exec(function(err, results) {
            if (err) {
                console.log(err);
                return next(new GeneralServerError("500", {
                    message: 'Mongo DB error: ' + err.message
                }));
            } else {
                res.status(200).jsonp(results);
            }
        });
    });
};

var deleteUsers = function(req, res, next) {
    var usersList = req.body.list;

    process.nextTick(function() {
        if (!req.isAdmin) {
            return next(new UnauthorizedAccessError("401", {
                message: 'Access Denied. Admin rights needed.'
            }));
        }
        User.remove({ _id: { $in: usersList } }, function(err, removed) {
            if (err) {
                return next(new GeneralServerError("500", {
                    message: 'Mongo DB error: ' + err.message
                }));
            } else if (!removed.result.n) {
                return next(new NotFoundError("404", {
                    message: 'Record not found'
                }));
            } else {
                return res.status(200).json({ message: 'Removed successfully!' });
            }
        });
    });
};

var updateUser = function(req, res, next) {
    var id = req.params.id,
        update = {
            username: req.body.username,
            email: utils.isEmail(req.body.email) ? req.body.email : null
        };
    process.nextTick(function() {
        if (!req.isAdmin) {
            return next(new UnauthorizedAccessError("401", {
                message: 'Access Denied. Admin rights needed.'
            }));
        }

        User.update({ _id: id }, update, { runValidators: true }, function(err, numberAffected, rawResponse) {
            if (err) {
                return next(new GeneralServerError("500", {
                    message: 'Mongo DB error: ' + err.message
                }));
            } else if (!numberAffected.nModified) {
                return next(new NotFoundError("404", {
                    message: 'Record not found'
                }));
            } else {
                res.status(200).json({ message: 'Updated successfully!' });
            }
        });
    });

};

module.exports = function() {

    var router = new Router();

    router.route("/create").post(createUser, function(req, res, next) {
        return res.status(200).json({
            "message": "User " + req.body.username + " has been successfully created"
        });
    });

    router.route("/verify").get(function(req, res, next) {
        return res.status(200).json(req.user);
    });

    router.route("/logout").get(function(req, res, next) {
        if (utils.expire(req.headers)) {
            delete req.user;
            return res.status(200).json({
                "message": "User has been successfully logged out"
            });
        } else {
            return next(new UnauthorizedAccessError("401"));
        }
    });

    router.route("/login").post(authenticate, function(req, res, next) {
        return res.status(200).json(req.user);
    });

    router.route("/isAdmin").get(function(req, res, next) {
        return res.status(200).json({ isAdmin: req.isAdmin });
    });

    router.route("/getAll").get(getAll, function(req, res, next) {
        return getAll(req, res, next);
    });

    router.route("/delete").delete(deleteUsers, function(req, res, next) {
        return deleteUsers(req, res, next);
    });

    router.route("/update/:id").put(updateUser, function(req, res, next) {
        return updateUser(req, res, next);
    });

    router.unless = require("express-unless");

    return router;
};

debug("Loaded");