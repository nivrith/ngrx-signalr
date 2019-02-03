"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("signalr");
var rxjs_1 = require("rxjs");
var hubStatus_1 = require("./hubStatus");
var getOrCreateSubject = function (subjects, event) {
    return subjects[event] || (subjects[event] = new rxjs_1.Subject());
};
var createConnection = function (url, errorSubject, stateSubject) {
    if (!$) {
        return { error: new Error('jQuery is not defined.') };
    }
    if (!$.hubConnection) {
        return { error: new Error('The $.hubConnection function is not defined. Please check if you imported SignalR correctly.') };
    }
    var connection = $.hubConnection(url);
    if (!connection) {
        return { error: new Error("Impossible to create the hub '" + url + "'.") };
    }
    connection.error(function (error) {
        return errorSubject.next(error);
    });
    connection.stateChanged(function (state) {
        return stateSubject.next(hubStatus_1.toSignalRState(state.newState));
    });
    return { connection: connection };
};
var SignalRHub = /** @class */ (function () {
    function SignalRHub(hubName, url) {
        this.hubName = hubName;
        this.url = url;
        this._startSubject = new rxjs_1.Subject();
        this._stateSubject = new rxjs_1.Subject();
        this._errorSubject = new rxjs_1.Subject();
        this._subjects = {};
        this.start$ = this._startSubject.asObservable();
        this.state$ = this._stateSubject.asObservable();
        this.error$ = this._errorSubject.asObservable();
    }
    SignalRHub.prototype.start = function () {
        var _this = this;
        if (!this._connection) {
            var _a = createConnection(this.url, this._errorSubject, this._stateSubject), connection = _a.connection, error = _a.error;
            if (error) {
                this._startSubject.error(error);
                return rxjs_1.throwError(error);
            }
            this._connection = connection;
            if (!this._connection) {
                var error_1 = new Error('Impossible to start the connection...');
                this._startSubject.error(error_1);
                return rxjs_1.throwError(error_1);
            }
        }
        if (!this.hasSubscriptions()) {
            console.warn('No listeners have been setup. You need to setup a listener before starting the connection or you will not receive data.');
        }
        this._connection.start()
            .done(function (_) { return _this._startSubject.next(); })
            .fail(function (error) { return _this._startSubject.error(error); });
        return this._startSubject.asObservable();
    };
    SignalRHub.prototype.on = function (event) {
        if (!this._connection) {
            var _a = createConnection(this.url, this._errorSubject, this._stateSubject), connection = _a.connection, error = _a.error;
            if (error) {
                this._startSubject.error(error);
                return rxjs_1.throwError(error);
            }
            this._connection = connection;
            if (!this._connection) {
                return rxjs_1.throwError(new Error('Impossible to listen to the connection...'));
            }
        }
        if (!this._proxy) {
            this._proxy = this._connection.createHubProxy(this.hubName);
        }
        var subject = getOrCreateSubject(this._subjects, event);
        this._proxy.on(event, function (data) { return subject.next(data); });
        return subject.asObservable();
    };
    SignalRHub.prototype.send = function (method) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var _a;
        if (!this._connection) {
            return rxjs_1.throwError('The connection has not been started yet. Please start the connection by invoking the start method before attempting to send a message to the server.');
        }
        if (!this._proxy) {
            this._proxy = this._connection.createHubProxy(this.hubName);
        }
        return rxjs_1.from((_a = this._proxy).invoke.apply(_a, [method].concat(args)));
    };
    SignalRHub.prototype.hasSubscriptions = function () {
        for (var key in this._subjects) {
            if (this._subjects.hasOwnProperty(key)) {
                return true;
            }
        }
        return false;
    };
    return SignalRHub;
}());
exports.SignalRHub = SignalRHub;
var hubs = [];
function findHub(x, url) {
    if (typeof x === 'string') {
        return hubs.filter(function (h) { return h.hubName === x && h.url === url; })[0];
    }
    return hubs.filter(function (h) { return h.hubName === x.hubName && h.url === x.url; })[0];
}
exports.findHub = findHub;
;
exports.createHub = function (hubName, url) {
    var hub = new SignalRHub(hubName, url);
    hubs.push(hub);
    return hub;
};