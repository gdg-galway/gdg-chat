// linkify() replaces URLs with HTML links
if (!String.linkify) {
    String.prototype.linkify = function() {
        var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
        var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
        var emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;
        return this.replace(urlPattern, '<a href="$&">$&</a>').replace(pseudoUrlPattern, '$1<a href="http://$2">$2</a>').replace(emailAddressPattern, '<a href="mailto:$&">$&</a>');
    };
}

// HTML Elements
var chatbox = document.getElementById('chatbox');
var messagebox = document.getElementById('messages');
var input = document.getElementById('message');
var send = document.getElementById('send');
var file = document.getElementById('file');
var uploadBtn = document.getElementById('upload');
var connectBtn = document.getElementById('connect');
var logoutBtn = document.getElementById('logout');
var connectPanel = document.getElementById('connect-panel');
var userPanel = document.getElementById('user-panel');

// Global Variables
var user;
var messages = [];
var imageFormats = ['jpg', 'jpeg', 'png', 'gif'];
var scrollHeight = -1;
var startingKey;