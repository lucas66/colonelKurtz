'use strict'; var Logging = { level: 0, log: function () { } }; var AuthenticationContext; if (typeof module !== 'undefined' && module.exports) { module.exports.inject = function (conf) { return new AuthenticationContext(conf); }; }
AuthenticationContext = function (config) {
    this.REQUEST_TYPE = { LOGIN: 'LOGIN', RENEW_TOKEN: 'RENEW_TOKEN', UNKNOWN: 'UNKNOWN' }; this.CONSTANTS = { ACCESS_TOKEN: 'access_token', EXPIRES_IN: 'expires_in', ID_TOKEN: 'id_token', ERROR_DESCRIPTION: 'error_description', SESSION_STATE: 'session_state', STORAGE: { TOKEN_KEYS: 'adal.token.keys', ACCESS_TOKEN_KEY: 'adal.access.token.key', EXPIRATION_KEY: 'adal.expiration.key', START_PAGE: 'adal.start.page', START_PAGE_PARAMS: 'adal.start.page.params', STATE_LOGIN: 'adal.state.login', STATE_RENEW: 'adal.state.renew', STATE_RENEW_RESOURCE: 'adal.state.renew.resource', NONCE_IDTOKEN: 'adal.nonce.idtoken', SESSION_STATE: 'adal.session.state', USERNAME: 'adal.username', IDTOKEN: 'adal.idtoken', ERROR: 'adal.error', ERROR_DESCRIPTION: 'adal.error.description', LOGIN_REQUEST: 'adal.login.request', LOGIN_ERROR: 'adal.login.error' }, RESOURCE_DELIMETER: '|', ERR_MESSAGES: { NO_TOKEN: 'User is not authorized' }, LOGGING_LEVEL: { ERROR: 0, WARN: 1, INFO: 2, VERBOSE: 3 }, LEVEL_STRING_MAP: { 0: 'ERROR:', 1: 'WARNING:', 2: 'INFO:', 3: 'VERBOSE:' } }; if (AuthenticationContext.prototype._singletonInstance) { return AuthenticationContext.prototype._singletonInstance; }
    AuthenticationContext.prototype._singletonInstance = this; this.instance = 'https://login.microsoftonline.com/'; this.config = {}; this.callback = null; this.popUp = false; this._user = null; this._activeRenewals = {}; this._loginInProgress = false; this._renewStates = []; window.callBackMappedToRenewStates = {}; window.callBacksMappedToRenewStates = {}; if (config.displayCall && typeof config.displayCall !== 'function') { throw new Error('displayCall is not a function'); }
    if (!config.clientId) { throw new Error('clientId is required'); }
    if (!config.correlationId) { config.correlationId = this._guid(); }
    this.config = this._cloneConfig(config); if (!this.config.loginResource) { this.config.loginResource = this.config.clientId; }
    if (!this.config.redirectUri) { this.config.redirectUri = window.location.href; }
}; AuthenticationContext.prototype.login = function () { var expectedState = this._guid(); this.config.state = expectedState; this._idTokenNonce = this._guid(); this.verbose('Expected state: ' + expectedState + ' startPage:' + window.location); this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, window.location); this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, ''); this._saveItem(this.CONSTANTS.STORAGE.STATE_LOGIN, expectedState); this._saveItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN, this._idTokenNonce); this._saveItem(this.CONSTANTS.STORAGE.ERROR, ''); this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, ''); var urlNavigate = this._getNavigateUrl('id_token', null) + '&nonce=' + encodeURIComponent(this._idTokenNonce); this.frameCallInProgress = false; this._loginInProgress = true; if (this.config.displayCall) { this.config.displayCall(urlNavigate); } else { this.promptUser(urlNavigate); } }; AuthenticationContext.prototype.loginInProgress = function () { return this._loginInProgress; }; AuthenticationContext.prototype._hasResource = function (key) { var keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS); return keys && !this._isEmpty(keys) && (keys.indexOf(key + this.CONSTANTS.RESOURCE_DELIMETER) > -1); }; AuthenticationContext.prototype.getCachedToken = function (resource) {
    if (!this._hasResource(resource)) { return null; }
    var token = this._getItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource); var expired = this._getItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource); var offset = this.config.expireOffsetSeconds || 120; if (expired && (expired > this._now() + offset)) { return token; } else { this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, ''); this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, 0); return null; }
}; AuthenticationContext.prototype.getCachedUser = function () {
    if (this._user) { return this._user; }
    var idtoken = this._getItem(this.CONSTANTS.STORAGE.IDTOKEN); this._user = this._createUser(idtoken); return this._user;
}; AuthenticationContext.prototype.registerCallback = function (expectedState, resource, callback) {
    this._activeRenewals[resource] = expectedState; if (!window.callBacksMappedToRenewStates[expectedState]) { window.callBacksMappedToRenewStates[expectedState] = []; }
    var self = this; window.callBacksMappedToRenewStates[expectedState].push(callback); if (!window.callBackMappedToRenewStates[expectedState]) {
        window.callBackMappedToRenewStates[expectedState] = function (message, token) {
            for (var i = 0; i < window.callBacksMappedToRenewStates[expectedState].length; ++i) { window.callBacksMappedToRenewStates[expectedState][i](message, token); }
            self._activeRenewals[resource] = null; window.callBacksMappedToRenewStates[expectedState] = null; window.callBackMappedToRenewStates[expectedState] = null;
        };
    }
}; AuthenticationContext.prototype._renewToken = function (resource, callback) {
    this.info('renewToken is called for resource:' + resource); var frameHandle = this._addAdalFrame('adalRenewFrame' + resource); var expectedState = this._guid() + '|' + resource; this._idTokenNonce = this._guid(); this.config.state = expectedState; this._renewStates.push(expectedState); this.verbose('Renew token Expected state: ' + expectedState); var urlNavigate = this._getNavigateUrl('token', resource) + '&prompt=none&login_hint=' + encodeURIComponent(this._user.userName); if (!this._urlContainsQueryStringParameter("domain_hint", urlNavigate)) { urlNavigate += '&domain_hint=' + encodeURIComponent(this._getDomainHint()); }
    urlNavigate += '&nonce=' + encodeURIComponent(this._idTokenNonce); this.callback = callback; this.registerCallback(expectedState, resource, callback); this.idTokenNonce = null; this.verbose('Navigate to:' + urlNavigate); this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, ''); frameHandle.src = 'about:blank'; this._loadFrame(urlNavigate, 'adalRenewFrame' + resource);
}; AuthenticationContext.prototype._renewIdToken = function (callback) {
    this.info('renewIdToken is called'); var frameHandle = this._addAdalFrame('adalIdTokenFrame'); var expectedState = this._guid() + '|' + this.config.clientId; this._idTokenNonce = this._guid(); this._saveItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN, this._idTokenNonce); this.config.state = expectedState; this._renewStates.push(expectedState); this.verbose('Renew Idtoken Expected state: ' + expectedState); var urlNavigate = this._getNavigateUrl('id_token', null) + '&prompt=none&login_hint=' + encodeURIComponent(this._user.userName); if (!this._urlContainsQueryStringParameter("domain_hint", urlNavigate)) { urlNavigate += '&domain_hint=' + encodeURIComponent(this._getDomainHint()); }
    urlNavigate += '&nonce=' + encodeURIComponent(this._idTokenNonce); this.registerCallback(expectedState, this.config.clientId, callback); this.idTokenNonce = null; this.verbose('Navigate to:' + urlNavigate); this._saveItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST, ''); frameHandle.src = 'about:blank'; this._loadFrame(urlNavigate, 'adalIdTokenFrame');
}; AuthenticationContext.prototype._urlContainsQueryStringParameter = function (name, url) { var regex = new RegExp("[\\?&]" + name + "="); return regex.test(url); }
AuthenticationContext.prototype._loadFrame = function (urlNavigate, frameName) { var self = this; self.info('LoadFrame: ' + frameName); var frameCheck = frameName; setTimeout(function () { var frameHandle = self._addAdalFrame(frameCheck); if (frameHandle.src === '' || frameHandle.src === 'about:blank') { frameHandle.src = urlNavigate; self._loadFrame(urlNavigate, frameCheck); } }, 500); }; AuthenticationContext.prototype.acquireToken = function (resource, callback) {
    if (this._isEmpty(resource)) { this.warn('resource is required'); callback('resource is required', null); return; }
    var token = this.getCachedToken(resource); if (token) { this.info('Token is already in cache for resource:' + resource); callback(null, token); return; }
    if (!this._user) { this.warn('User login is required'); callback('User login is required', null); return; }
    if (this._activeRenewals[resource]) { this.registerCallback(this._activeRenewals[resource], resource, callback); }
    else { if (resource === this.config.clientId) { this.verbose('renewing idtoken'); this._renewIdToken(callback); } else { this._renewToken(resource, callback); } }
}; AuthenticationContext.prototype.promptUser = function (urlNavigate) { if (urlNavigate) { this.info('Navigate to:' + urlNavigate); window.location.replace(urlNavigate); } else { this.info('Navigate url is empty'); } }; AuthenticationContext.prototype.clearCache = function () {
    this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY, ''); this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY, 0); this._saveItem(this.CONSTANTS.STORAGE.SESSION_STATE, ''); this._saveItem(this.CONSTANTS.STORAGE.STATE_LOGIN, ''); this._renewStates = []; this._saveItem(this.CONSTANTS.STORAGE.START_PAGE, ''); this._saveItem(this.CONSTANTS.STORAGE.START_PAGE_PARAMS, ''); this._saveItem(this.CONSTANTS.STORAGE.USERNAME, ''); this._saveItem(this.CONSTANTS.STORAGE.IDTOKEN, ''); this._saveItem(this.CONSTANTS.STORAGE.ERROR, ''); this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, ''); var keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS); if (!this._isEmpty(keys)) { keys = keys.split(this.CONSTANTS.RESOURCE_DELIMETER); for (var i = 0; i < keys.length; i++) { this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + keys[i], ''); this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + keys[i], 0); } }
    this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, '');
}; AuthenticationContext.prototype.clearCacheForResource = function (resource) { this._saveItem(this.CONSTANTS.STORAGE.STATE_RENEW, ''); this._saveItem(this.CONSTANTS.STORAGE.ERROR, ''); this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, ''); if (this._hasResource(resource)) { this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, ''); this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, 0); } }; AuthenticationContext.prototype.logOut = function () {
    this.clearCache(); var tenant = 'common'; var logout = ''; this._user = null; if (this.config.tenant) { tenant = this.config.tenant; }
    if (this.config.instance) { this.instance = this.config.instance; }
    if (this.config.postLogoutRedirectUri) { logout = 'post_logout_redirect_uri=' + encodeURIComponent(this.config.postLogoutRedirectUri); }
    var urlNavigate = this.instance + tenant + '/oauth2/logout?' + logout; this.info('Logout navigate to: ' + urlNavigate); this.promptUser(urlNavigate);
}; AuthenticationContext.prototype._isEmpty = function (str) { return (typeof str === 'undefined' || !str || 0 === str.length); }; AuthenticationContext.prototype.getUser = function (callback) {
    if (typeof callback !== 'function') { throw new Error('callback is not a function'); }
    this.callback = callback; if (this._user) { this.callback(null, this._user); return; }
    var idtoken = this._getItem(this.CONSTANTS.STORAGE.IDTOKEN); if (!this._isEmpty(idtoken)) { this.info('User exists in cache: '); this._user = this._createUser(idtoken); this.callback(null, this._user); } else { this.warn('User information is not available'); this.callback('User information is not available'); }
}; AuthenticationContext.prototype._getDomainHint = function () {
    if (this._user && this._user.userName && this._user.userName.indexOf('@') > -1) { var parts = this._user.userName.split('@'); return parts[parts.length - 1]; }
    return '';
}; AuthenticationContext.prototype._createUser = function (idToken) {
    var user = null; var parsedJson = this._extractIdToken(idToken); if (parsedJson && parsedJson.hasOwnProperty('aud')) { if (parsedJson.aud.toLowerCase() === this.config.clientId.toLowerCase()) { user = { userName: '', profile: parsedJson }; if (parsedJson.hasOwnProperty('upn')) { user.userName = parsedJson.upn; } else if (parsedJson.hasOwnProperty('email')) { user.userName = parsedJson.email; } } else { this.warn('IdToken has invalid aud field'); } }
    return user;
}; AuthenticationContext.prototype._getHash = function (hash) {
    if (hash.indexOf('#/') > -1) { hash = hash.substring(hash.indexOf('#/') + 2); } else if (hash.indexOf('#') > -1) { hash = hash.substring(1); }
    return hash;
}; AuthenticationContext.prototype.isCallback = function (hash) { hash = this._getHash(hash); var parameters = this._deserialize(hash); return (parameters.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION) || parameters.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN) || parameters.hasOwnProperty(this.CONSTANTS.ID_TOKEN)); }; AuthenticationContext.prototype.getLoginError = function () { return this._getItem(this.CONSTANTS.STORAGE.LOGIN_ERROR); }; AuthenticationContext.prototype.getRequestInfo = function (hash) {
    hash = this._getHash(hash); var parameters = this._deserialize(hash); var requestInfo = { valid: false, parameters: {}, stateMatch: false, stateResponse: '', requestType: this.REQUEST_TYPE.UNKNOWN }; if (parameters) {
        requestInfo.parameters = parameters; if (parameters.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION) || parameters.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN) || parameters.hasOwnProperty(this.CONSTANTS.ID_TOKEN)) {
            requestInfo.valid = true; var stateResponse = ''; if (parameters.hasOwnProperty('state')) { this.verbose('State: ' + parameters.state); stateResponse = parameters.state; } else { this.warn('No state returned'); return requestInfo; }
            requestInfo.stateResponse = stateResponse; if (stateResponse === this._getItem(this.CONSTANTS.STORAGE.STATE_LOGIN)) { requestInfo.requestType = this.REQUEST_TYPE.LOGIN; requestInfo.stateMatch = true; return requestInfo; }
            if (!requestInfo.stateMatch && window.parent && window.parent.AuthenticationContext()) { var statesInParentContext = window.parent.AuthenticationContext()._renewStates; for (var i = 0; i < statesInParentContext.length; i++) { if (statesInParentContext[i] === requestInfo.stateResponse) { requestInfo.requestType = this.REQUEST_TYPE.RENEW_TOKEN; requestInfo.stateMatch = true; break; } } }
        }
    }
    return requestInfo;
}; AuthenticationContext.prototype._getResourceFromState = function (state) {
    if (state) { var splitIndex = state.indexOf('|'); if (splitIndex > -1 && splitIndex + 1 < state.length) { return state.substring(splitIndex + 1); } }
    return '';
}; AuthenticationContext.prototype.saveTokenFromHash = function (requestInfo) {
    this.info('State status:' + requestInfo.stateMatch + '; Request type:' + requestInfo.requestType); this._saveItem(this.CONSTANTS.STORAGE.ERROR, ''); this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, ''); if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ERROR_DESCRIPTION)) { this.info('Error :' + requestInfo.parameters.error + '; Error description:' + requestInfo.parameters[this.CONSTANTS.ERROR_DESCRIPTION]); this._saveItem(this.CONSTANTS.STORAGE.ERROR, requestInfo.parameters.error); this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, requestInfo.parameters[this.CONSTANTS.ERROR_DESCRIPTION]); if (requestInfo.requestType === this.REQUEST_TYPE.LOGIN) { this._loginInProgress = false; this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, requestInfo.parameters.errorDescription); } } else {
        if (requestInfo.stateMatch) {
            this.info('State is right'); if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.SESSION_STATE)) { this._saveItem(this.CONSTANTS.STORAGE.SESSION_STATE, requestInfo.parameters[this.CONSTANTS.SESSION_STATE]); }
            var keys, resource; if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ACCESS_TOKEN)) {
                this.info('Fragment has access token'); resource = this._getResourceFromState(requestInfo.stateResponse); if (!this._hasResource(resource)) { keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) || ''; this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, keys + resource + this.CONSTANTS.RESOURCE_DELIMETER); }
                this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, requestInfo.parameters[this.CONSTANTS.ACCESS_TOKEN]); this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, this._expiresIn(requestInfo.parameters[this.CONSTANTS.EXPIRES_IN]));
            }
            if (requestInfo.parameters.hasOwnProperty(this.CONSTANTS.ID_TOKEN)) {
                this.info('Fragment has id token'); this._loginInProgress = false; this._user = this._createUser(requestInfo.parameters[this.CONSTANTS.ID_TOKEN]); if (this._user && this._user.profile) {
                    if (this._user.profile.nonce !== this._getItem(this.CONSTANTS.STORAGE.NONCE_IDTOKEN)) { this._user = null; this._saveItem(this.CONSTANTS.STORAGE.LOGIN_ERROR, 'Nonce is not same as ' + this._idTokenNonce); } else {
                        this._saveItem(this.CONSTANTS.STORAGE.IDTOKEN, requestInfo.parameters[this.CONSTANTS.ID_TOKEN]); resource = this.config.loginResource ? this.config.loginResource : this.config.clientId; if (!this._hasResource(resource)) { keys = this._getItem(this.CONSTANTS.STORAGE.TOKEN_KEYS) || ''; this._saveItem(this.CONSTANTS.STORAGE.TOKEN_KEYS, keys + resource + this.CONSTANTS.RESOURCE_DELIMETER); }
                        this._saveItem(this.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + resource, requestInfo.parameters[this.CONSTANTS.ID_TOKEN]); this._saveItem(this.CONSTANTS.STORAGE.EXPIRATION_KEY + resource, this._user.profile.exp);
                    }
                }
            }
        } else { this._saveItem(this.CONSTANTS.STORAGE.ERROR, 'Invalid_state'); this._saveItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION, 'Invalid_state. state: ' + requestInfo.stateResponse); }
    }
}; AuthenticationContext.prototype.getResourceForEndpoint = function (endpoint) {
    if (this.config && this.config.endpoints) { for (var configEndpoint in this.config.endpoints) { if (endpoint.indexOf(configEndpoint) > -1) { return this.config.endpoints[configEndpoint]; } } }
    if (endpoint.indexOf('http://') > -1 || endpoint.indexOf('https://') > -1) { if (this._getHostFromUri(endpoint) === this._getHostFromUri(this.config.redirectUri)) { return this.config.loginResource; } }
    else {
        if (this.config && this.config.anonymousEndpoints) { for (var i = 0; i < this.config.anonymousEndpoints.length; i++) { if (endpoint.indexOf(this.config.anonymousEndpoints[i]) > -1) { return null; } } }
        return this.config.loginResource;
    }
    return null;
}; AuthenticationContext.prototype._getHostFromUri = function (uri) { var extractedUri = String(uri).replace(/^(https?:)\/\//, ''); extractedUri = extractedUri.split('/')[0]; return extractedUri; }; AuthenticationContext.prototype.handleWindowCallback = function () {
    var hash = window.location.hash; if (this.isCallback(hash)) {
        var requestInfo = this.getRequestInfo(hash); this.info('Returned from redirect url'); this.saveTokenFromHash(requestInfo); var callback = null; if ((requestInfo.requestType === this.REQUEST_TYPE.RENEW_TOKEN && window.parent)) { this.verbose('Window is in iframe'); callback = window.parent.callBackMappedToRenewStates[requestInfo.stateResponse]; window.src = ''; } else if (window && window.oauth2Callback) { this.verbose('Window is redirecting'); callback = this.callback; }
        window.location.hash = ''; window.location = this._getItem(this.CONSTANTS.STORAGE.LOGIN_REQUEST); if (requestInfo.requestType === this.REQUEST_TYPE.RENEW_TOKEN) { callback(this._getItem(this.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters[this.CONSTANTS.ACCESS_TOKEN] || requestInfo.parameters[this.CONSTANTS.ID_TOKEN]); return; }
    }
}; AuthenticationContext.prototype._getNavigateUrl = function (responseType, resource) {
    var tenant = 'common'; if (this.config.tenant) { tenant = this.config.tenant; }
    if (this.config.instance) { this.instance = this.config.instance; }
    var urlNavigate = this.instance + tenant + '/oauth2/authorize' + this._serialize(responseType, this.config, resource) + this._addLibMetadata(); this.info('Navigate url:' + urlNavigate); return urlNavigate;
}; AuthenticationContext.prototype._extractIdToken = function (encodedIdToken) {
    var decodedToken = this._decodeJwt(encodedIdToken); if (!decodedToken) { return null; }
    try {
        var base64IdToken = decodedToken.JWSPayload; var base64Decoded = this._base64DecodeStringUrlSafe(base64IdToken); if (!base64Decoded) { this.info('The returned id_token could not be base64 url safe decoded.'); return null; }
        return JSON.parse(base64Decoded);
    } catch (err) { this.error('The returned id_token could not be decoded', err); }
    return null;
}; AuthenticationContext.prototype._extractUserName = function (encodedIdToken) {
    try { var parsed = this._extractIdToken(encodedIdToken); if (parsed) { if (parsed.hasOwnProperty('upn')) { return parsed.upn; } else if (parsed.hasOwnProperty('email')) { return parsed.email; } } } catch (err) { this.error('The returned id_token could not be decoded', err); }
    return null;
}; AuthenticationContext.prototype._base64DecodeStringUrlSafe = function (base64IdToken) {
    base64IdToken = base64IdToken.replace(/-/g, '+').replace(/_/g, '/'); if (window.atob) { return decodeURIComponent(escape(window.atob(base64IdToken))); }
    else { return decodeURIComponent(escape(this._decode(base64IdToken))); }
}; AuthenticationContext.prototype._decode = function (base64IdToken) {
    var codes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='; base64IdToken = String(base64IdToken).replace(/=+$/, ''); var length = base64IdToken.length; if (length % 4 === 1) { throw new Error('The token to be decoded is not correctly encoded.'); }
    var h1, h2, h3, h4, bits, c1, c2, c3, decoded = ''; for (var i = 0; i < length; i += 4) {
        h1 = codes.indexOf(base64IdToken.charAt(i)); h2 = codes.indexOf(base64IdToken.charAt(i + 1)); h3 = codes.indexOf(base64IdToken.charAt(i + 2)); h4 = codes.indexOf(base64IdToken.charAt(i + 3)); if (i + 2 === length - 1) { bits = h1 << 18 | h2 << 12 | h3 << 6; c1 = bits >> 16 & 255; c2 = bits >> 8 & 255; decoded += String.fromCharCode(c1, c2); break; }
        else if (i + 1 === length - 1) {
            bits = h1 << 18 | h2 << 12
            c1 = bits >> 16 & 255; decoded += String.fromCharCode(c1); break;
        }
        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4; c1 = bits >> 16 & 255; c2 = bits >> 8 & 255; c3 = bits & 255; decoded += String.fromCharCode(c1, c2, c3);
    }
    return decoded;
}; AuthenticationContext.prototype._decodeJwt = function (jwtToken) {
    if (this._isEmpty(jwtToken)) { return null; }; var idTokenPartsRegex = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/; var matches = idTokenPartsRegex.exec(jwtToken); if (!matches || matches.length < 4) { this.warn('The returned id_token is not parseable.'); return null; }
    var crackedToken = { header: matches[1], JWSPayload: matches[2], JWSSig: matches[3] }; return crackedToken;
}; AuthenticationContext.prototype._convertUrlSafeToRegularBase64EncodedString = function (str) { return str.replace('-', '+').replace('_', '/'); }; AuthenticationContext.prototype._serialize = function (responseType, obj, resource) {
    var str = []; if (obj !== null) {
        str.push('?response_type=' + responseType); str.push('client_id=' + encodeURIComponent(obj.clientId)); if (resource) { str.push('resource=' + encodeURIComponent(resource)); }
        str.push('redirect_uri=' + encodeURIComponent(obj.redirectUri)); str.push('state=' + encodeURIComponent(obj.state)); if (obj.hasOwnProperty('slice')) { str.push('slice=' + encodeURIComponent(obj.slice)); }
        if (obj.hasOwnProperty('extraQueryParameter')) { str.push(obj.extraQueryParameter); }
        if (obj.correlationId) { str.push('client-request-id=' + encodeURIComponent(obj.correlationId)); }
    }
    return str.join('&');
}; AuthenticationContext.prototype._deserialize = function (query) {
    var match, pl = /\+/g, search = /([^&=]+)=?([^&]*)/g, decode = function (s) { return decodeURIComponent(s.replace(pl, ' ')); }, obj = {}; match = search.exec(query); while (match) { obj[decode(match[1])] = decode(match[2]); match = search.exec(query); }
    return obj;
}; AuthenticationContext.prototype._guid = function () {
    var guidHolder = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'; var hex = '0123456789abcdef'; var r = 0; var guidResponse = ""; for (var i = 0; i < 36; i++) {
        if (guidHolder[i] !== '-' && guidHolder[i] !== '4') { r = Math.random() * 16 | 0; }
        if (guidHolder[i] === 'x') { guidResponse += hex[r]; } else if (guidHolder[i] === 'y') { r &= 0x3; r |= 0x8; guidResponse += hex[r]; } else { guidResponse += guidHolder[i]; }
    }
    return guidResponse;
}; AuthenticationContext.prototype._expiresIn = function (expires) { return this._now() + parseInt(expires, 10); }; AuthenticationContext.prototype._now = function () { return Math.round(new Date().getTime() / 1000.0); }; AuthenticationContext.prototype._addAdalFrame = function (iframeId) {
    if (typeof iframeId === 'undefined') { return; }
    this.info('Add adal frame to document:' + iframeId); var adalFrame = document.getElementById(iframeId); if (!adalFrame) {
        if (document.createElement && document.documentElement && (window.opera || window.navigator.userAgent.indexOf('MSIE 5.0') === -1)) { var ifr = document.createElement('iframe'); ifr.setAttribute('id', iframeId); ifr.style.visibility = 'hidden'; ifr.style.position = 'absolute'; ifr.style.width = ifr.style.height = ifr.borderWidth = '0px'; adalFrame = document.getElementsByTagName('body')[0].appendChild(ifr); }
        else if (document.body && document.body.insertAdjacentHTML) { document.body.insertAdjacentHTML('beforeEnd', '<iframe name="' + iframeId + '" id="' + iframeId + '" style="display:none"></iframe>'); }
        if (window.frames && window.frames[iframeId]) { adalFrame = window.frames[iframeId]; }
    }
    return adalFrame;
}; AuthenticationContext.prototype._saveItem = function (key, obj) {
    if (this.config && this.config.cacheLocation && this.config.cacheLocation === 'localStorage') {
        if (!this._supportsLocalStorage()) { this.info('Local storage is not supported'); return false; }
        localStorage.setItem(key, obj); return true;
    }
    if (!this._supportsSessionStorage()) { this.info('Session storage is not supported'); return false; }
    sessionStorage.setItem(key, obj); return true;
}; AuthenticationContext.prototype._getItem = function (key) {
    if (this.config && this.config.cacheLocation && this.config.cacheLocation === 'localStorage') {
        if (!this._supportsLocalStorage()) { this.info('Local storage is not supported'); return null; }
        return localStorage.getItem(key);
    }
    if (!this._supportsSessionStorage()) { this.info('Session storage is not supported'); return null; }
    return sessionStorage.getItem(key);
}; AuthenticationContext.prototype._supportsLocalStorage = function () { try { return 'localStorage' in window && window['localStorage']; } catch (e) { return false; } }; AuthenticationContext.prototype._supportsSessionStorage = function () { try { return 'sessionStorage' in window && window['sessionStorage']; } catch (e) { return false; } }; AuthenticationContext.prototype._cloneConfig = function (obj) {
    if (null === obj || 'object' !== typeof obj) { return obj; }
    var copy = {}; for (var attr in obj) { if (obj.hasOwnProperty(attr)) { copy[attr] = obj[attr]; } }
    return copy;
}; AuthenticationContext.prototype._addLibMetadata = function () { return '&x-client-SKU=Js&x-client-Ver=' + this._libVersion(); }; AuthenticationContext.prototype.log = function (level, message, error) {
    if (level <= Logging.level) {
        var correlationId = this.config.correlationId; var timestamp = new Date().toUTCString(); var formattedMessage = timestamp + ':' + correlationId + '-' + this._libVersion() + '-' + this.CONSTANTS.LEVEL_STRING_MAP[level] + ' ' + message; if (error) { formattedMessage += '\nstack:\n' + error.stack; }
        Logging.log(formattedMessage);
    }
}; AuthenticationContext.prototype.error = function (message, error) { this.log(this.CONSTANTS.LOGGING_LEVEL.ERROR, message, error); }; AuthenticationContext.prototype.warn = function (message) { this.log(this.CONSTANTS.LOGGING_LEVEL.WARN, message, null); }; AuthenticationContext.prototype.info = function (message) { this.log(this.CONSTANTS.LOGGING_LEVEL.INFO, message, null); }; AuthenticationContext.prototype.verbose = function (message) { this.log(this.CONSTANTS.LOGGING_LEVEL.VERBOSE, message, null); }; AuthenticationContext.prototype._libVersion = function () { return '1.0.10'; };