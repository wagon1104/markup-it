'use strict';

// quote related
var singleQuoted = /'(?:[^'\\]|\\.)*'/;
var doubleQuoted = /"(?:[^"\\]|\\.)*"/;
var quoted = new RegExp(singleQuoted.source + '|' + doubleQuoted.source);

// basic types
var integer = /-?\d+/;
var number = /-?\d+\.?\d*|\.?\d+/;
var bool = /true|false/;

// property access
var identifier = /[\w-]+/;
var literal = new RegExp('(?:' + quoted.source + '|' + bool.source + '|' + number.source + ')');

// Match inner of the tag to split the name and the props
var tagLine = new RegExp('^\\s*(' + identifier.source + ')\\s*(.*)\\s*$');

// Types
var numberLine = new RegExp('^' + number.source + '$');
var boolLine = new RegExp('^' + bool.source + '$', 'i');
var quotedLine = new RegExp('^' + quoted.source + '$');

// Assignment of a variable message="Hello"
var assignment = new RegExp('(' + identifier.source + ')s*=s*(' + literal.source + ')');

// Argument or kwargs
var delimiter = /(?:\s*|^)/;
var prop = new RegExp('(?:' + delimiter.source + ')(?:(' + assignment.source + '|' + literal.source + '))');

module.exports = {
    prop: prop,
    quoted: quoted, number: number, bool: bool, literal: literal, integer: integer,
    identifier: identifier,
    quotedLine: quotedLine,
    numberLine: numberLine,
    boolLine: boolLine,
    tagLine: tagLine
};