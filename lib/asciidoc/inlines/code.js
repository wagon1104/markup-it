'use strict';

var _require = require('../../'),
    Serializer = _require.Serializer,
    MARKS = _require.MARKS;

/**
 * Serialize an inline code to Asciidoc
 * @type {Serializer}
 */


var serialize = Serializer().transformMarkedRange(MARKS.CODE, function (state, text, mark) {
    return '``' + text + '``';
});

module.exports = { serialize: serialize };