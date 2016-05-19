var reBlock = require('./re/block');
var markup = require('../../');
var utils = require('./utils');

var reList = reBlock.list;

// Return true if block is a list
function isListItem(type) {
    return (type == markup.BLOCKS.UL_ITEM || type == markup.BLOCKS.OL_ITEM);
}

// Rule for lists, rBlock.list match the whole (multilines) list, we stop at the first item
function listRule(type) {
    return markup.Rule(type)
        .setOption('parse', 'block')
        .regExp(reList.block, function(match) {
            var rawList = match[0];
            var bull = match[2];
            var ordered = bull.length > 1;

            if (ordered && type === markup.BLOCKS.UL_ITEM) return;
            if (!ordered && type === markup.BLOCKS.OL_ITEM) return;

            var item;

            reList.item.lastIndex = 0;
            var lastIndex = 0;

            var result = [];
            var rawItem, textItem, space;

            while ((item = reList.item.exec(rawList)) !== null) {
                rawItem = rawList.slice(lastIndex, reList.item.lastIndex);

                // Remove the list item's bullet
                // so it is seen as the next token.
                textItem = item[0];
                space = textItem.length;
                textItem = textItem.replace(/^ *([*+-]|\d+\.) +/, '');

                // Outdent whatever the
                // list item contains. Hacky.
                if (~textItem.indexOf('\n ')) {
                    space -= textItem.length;
                    textItem =  textItem.replace(new RegExp('^ {1,' + space + '}', 'gm'), '');
                }

                result.push({
                    type: type,
                    raw: rawItem,
                    text: textItem
                });

                lastIndex = reList.item.lastIndex;
            }


            return result;
        })
        .toText(function(text, block) {
            // Determine which bullet to use
            var bullet = '*';
            if (type == markup.BLOCKS.OL_ITEM) bullet = '1.';

            var nextBlock = block.next? block.next.type : null;

            // Determine end of line
            var eol = '';

            // We finish list if:
            //    - Next block is not a list
            //    - List from a different type with same depth
            if (!isListItem(nextBlock)) {
                eol = '\n';
            }

            // Add bullet
            text = bullet + ' ' + text;

            // Prepend text with spacing
            var lines = utils.splitLines(text);

            text = lines
                .map(function(line, i) {
                    if (i === 0) return line;
                    if (!line.trim()) return '';

                    return '  ' + line;
                })
                .join('\n');

            return (
                text + eol
            );
        });
}

module.exports = {
    ul: listRule(markup.BLOCKS.UL_ITEM),
    ol: listRule(markup.BLOCKS.OL_ITEM)
};
