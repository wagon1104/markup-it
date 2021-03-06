'use strict';

var _require = require('immutable'),
    List = _require.List;

var trimTrailingLines = require('trim-trailing-lines');

var _require2 = require('../../'),
    Serializer = _require2.Serializer,
    Deserializer = _require2.Deserializer,
    Block = _require2.Block;

var reBlock = require('../re/block');
var liquid = require('../liquid');

/**
 * Return true if a block type is a custom one.
 * @param  {String} tag
 * @return {Boolean}
 */
function isCustomType(type) {
    return type.indexOf('x-') === 0;
}

/**
 * Return liquid tag from a custom type.
 * @param  {String} type
 * @return {String} tag
 */
function getTagFromCustomType(type) {
    return type.slice(2);
}

/**
 * Return custom type from a liquid tag.
 * @param  {String} tag
 * @return {String} type
 */
function getCustomTypeFromTag(tag) {
    return 'x-' + tag;
}

/**
 * Return true if a type if the closing tag.
 * @param  {String} tag
 * @return {Boolean}
 */
function isClosingTag(tag) {
    return tag.indexOf('end') === 0;
}

/**
 * Return true if a type if the closing tag of another type
 * @param  {String} type
 * @return {Boolean}
 */
function isClosingTagFor(tag, forTag) {
    return tag.indexOf('end' + forTag) === 0;
}

/**
 * Serialize a templating block to markdown
 * @type {Serializer}
 */
var serialize = Serializer().matchType(isCustomType).then(function (state) {
    var node = state.peek();
    var type = node.type,
        data = node.data;


    var startTag = liquid.stringifyTag({
        tag: getTagFromCustomType(type),
        data: data
    });

    var unendingTags = state.getProp('unendingTags') || List();
    var endTag = unendingTags.includes(getTagFromCustomType(node.type)) ? '' : liquid.stringifyTag({
        tag: 'end' + getTagFromCustomType(node.type)
    });

    var split = node.kind == 'block' ? '\n' : '';
    var end = node.kind == 'block' ? '\n\n' : '';

    if (node.isVoid) {
        return state.shift().write('' + startTag + end);
    }

    var inner = trimTrailingLines(state.serialize(node.nodes));

    return state.shift().write('' + startTag + split + inner + split + endTag + end);
});

/**
 * Deserialize a templating block to a node.
 * @type {Deserializer}
 */
var deserialize = Deserializer().matchRegExp(reBlock.customBlock, function (state, match) {
    if (state.getProp('template') === false) {
        return;
    }

    var text = match[1].trim();

    var _liquid$parseTag = liquid.parseTag(text),
        tag = _liquid$parseTag.tag,
        data = _liquid$parseTag.data;

    var node = Block.create({
        type: getCustomTypeFromTag(tag),
        data: data,
        isVoid: true,
        nodes: List([state.genText()])
    });

    // This node is temporary
    if (isClosingTag(tag)) {
        return state.push(node);
    }

    // By default it'll add this node as a single node.
    state = state.push(node);

    // List of tags that don't have an end
    var unendingTags = state.getProp('unendingTags') || List();

    var resultState = state.lex({
        stopAt: function stopAt(newState) {
            // What nodes have been added in this iteration?
            var added = newState.nodes.skip(state.nodes.size);
            var between = added.takeUntil(function (child) {
                // Some tags don't have an explicit end and thus
                // need a special treatment
                if (unendingTags.includes(tag)) {
                    return isCustomType(child.type) && (
                    // Closing custom tag close previous unending tags
                    isClosingTag(getTagFromCustomType(child.type)) ||
                    // Unending tag close previous unending tags
                    unendingTags.includes(getTagFromCustomType(child.type)));
                }

                return isCustomType(child.type) && isClosingTagFor(getTagFromCustomType(child.type), tag);
            });

            if (between.size == added.size) {
                return;
            }

            // We skip the default node.
            var beforeNodes = state.nodes.butLast();
            var afterNodes = added.skip(between.size);

            return newState.merge({
                nodes: beforeNodes.push(node.merge({
                    isVoid: false,
                    nodes: between.size == 0 ? List([state.genText()]) : between
                })).concat(afterNodes)
                // Filter out this node's closing tag
                .filterNot(function (child) {
                    return isCustomType(child.type) && isClosingTag(getTagFromCustomType(child.type)) &&
                    // Don't swallow others' closing node by ensuring
                    // we filter the one that matches the current one
                    isClosingTagFor(getTagFromCustomType(child.type), tag);
                })
            });
        }
    });

    return resultState;
});

module.exports = { serialize: serialize, deserialize: deserialize };