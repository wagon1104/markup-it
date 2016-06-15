var reBlock = require('./re/block');
var markup = require('../../');
var utils = require('./utils');

// Rule for parsing code blocks
var blockRule = markup.Rule(markup.BLOCKS.CODE)
    .setOption('parse', false)
    .setOption('renderInner', false)

    // Fences
    .regExp(reBlock.fences, function(match) {
        return {
            text: match[3],
            data: {
                syntax: match[2]
            }
        };
    })

    // 4 spaces / Tab
    .regExp(reBlock.code, function(match) {
        var inner = match[0];

        // Remove indentation
        inner = inner.replace(/^( {4}|\t)/gm, '');

        // No pedantic mode
        inner = inner.replace(/\n+$/, '');

        return {
            text: inner,
            data: {
                syntax: undefined
            }
        };
    })

    // Output code blocks
    .toText(function(text, block) {
        var hasFences = text.indexOf('`') >= 0;

        // Use fences if syntax is set
        if (!hasFences) {
            return (
                '```' + (block.data.syntax || '') + '\n'
                + text
                + '```\n\n'
            );
        }

        // Use four spaces otherwise
        var lines = utils.splitLines(text);

        return lines
            .map(function(line) {
                if (!line.trim()) return '';
                return '    ' + line;
            })
            .join('\n') + '\n\n';
    });


module.exports = {
    block: blockRule
};
