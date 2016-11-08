const { Record, List, Map } = require('immutable');
const { Document, Text, Block } = require('slate');
const BLOCKS = require('../constants/blocks');
const RuleFunction = require('./rule-function');

/*
    State stores the global state when serializing a document or deseriaizing a text.
 */

function createTextBlock(text) {
    text = Text.createFromString(text);
    return Block.create({
        type: BLOCKS.TEXT,
        nodes: [text]
    });
}

const DEFAULTS = {
    text:        '',
    nodes:       List(),
    activeRules: String('blocks'),
    rulesSet:    Map(),
    depth:       0
};

class State extends Record(DEFAULTS) {

    /**
     * Create a new state from a set of rules.
     * @param  {Array} rules
     * @return {State} state
     */
    static create(rulesSet = {}) {
        return new State({
            rulesSet: Map(rulesSet).map(List)
        });
    }

    /**
     * Return list of rules currently being used
     * @return {List} rules
     */
    get rules() {
        const { activeRules, rulesSet } = this;
        return rulesSet.get(activeRules, List());
    }

    /**
     * Return kind of nodes currently being parsed
     * @return {String} kind
     */
    get kind() {
        const { nodes } = this;
        if (nodes.size == 0) {
            return 'block';
        }

        const hasBlock = nodes.some(node => node.kind == 'block');
        return hasBlock ? 'block' : 'inline';
    }

    /**
     * Change set of rules to use.
     *
     * @param  {String} activeRules
     * @return {State} state
     */
    use(activeRules) {
        return this.merge({ activeRules });
    }

    /**
     * Write a string. This method can be used when serializing nodes into text.
     *
     * @param  {String} string
     * @return {State} state
     */
    write(string) {
        let { text } = this;
        text += string;
        return this.merge({ text });
    }

    /**
     * Peek the first node in the stack
     *
     * @return {Node} node
     */
    peek() {
        return this.nodes.first();
    }

    /**
     * Shift the first node from the stack
     *
     * @return {State} state
     */
    shift() {
        let { nodes } = this;
        nodes = nodes.shift();
        return this.merge({ nodes });
    }

    /**
     * Move this state to a upper level
     *
     * @param  {Number} string
     * @return {State} state
     */
    up() {
        let { depth } = this;
        depth--;
        return this.merge({ depth });
    }

    /**
     * Move this state to a lower level
     *
     * @param  {Number} string
     * @return {State} state
     */
    down() {
        let { depth } = this;
        depth++;
        return this.merge({ depth });
    }

    /**
     * Push a new node to the stack. This method can be used when deserializing
     * a text into a set of nodes.
     *
     * @param  {Node} node
     * @return {State} state
     */
    push(node) {
        let { nodes } = this;
        nodes = nodes.push(node);
        return this.merge({ nodes });
    }

    /**
     * Skip "n" characters in the text.
     * @param  {Number} n
     * @return {State} state
     */
    skip(n) {
        let { text } = this;
        text = text.slice(n);
        return this.merge({ text });
    }

    /**
     * Parse current text buffer
     * @return {State} state
     */
    lex(rest = '') {
        const state = this;
        const { text } = state;

        let startState = state;
        if (rest) {
            const node = this.kind == 'block' ? createTextBlock(rest) : Text.createFromString(rest);
            startState = startState.push(node);
        }

        // No text to parse, we return
        if (!text) {
            return startState;
        }

        // We apply the rules to find the first amtching one
        const newState = startState.applyRules('deserialize');

        // Same state cause an infinite loop
        if (newState == startState) {
            throw new Error('A rule returns an identical state, returns undefined instead when passing.');
        }

        // No rules match, we move and try the next char
        if (!newState) {
            return state
                .skip(1)
                .lex(rest + text[0]);
        }

        // Otherwise we keep parsing
        return newState.lex(rest);
    }

    /**
     * Apply first matching rule
     * @param  {String} text
     * @return {State} state
     */
    applyRules(kind) {
        const state = this;
        const { rules } = state;
        let newState;

        rules.forEach(rule => {
            newState = RuleFunction.exec(rule[kind], state);
            if (newState) {
                return false;
            }
        });

        return newState;
    }

    /**
     * Deserialize a text into a Node.
     * @param  {String} text
     * @return {List<Node>} nodes
     */
    deserialize(text) {
        const state = this
            .down()
            .merge({ text, nodes: List() })
            .lex();

        return state.nodes;
    }

    /**
     * Deserialize a string content into a Document.
     * @param  {String} text
     * @return {Document} document
     */
    deserializeToDocument(text) {
        const nodes = this.deserialize(text);
        return Document.create({ nodes });
    }

    /**
     * Serialize nodes into text
     * @param  {List<Node>} nodes
     * @return {String} text
     */
    serialize(nodes) {
        const state = this
            .down()
            .merge({ text: '', nodes: List(nodes) })
            ._serialize();
        return state.text;
    }

    /**
     * Serialize a document into text
     * @param  {Document} document
     * @return {String} text
     */
    serializeDocument(document) {
        const { nodes } = document;
        return this.serialize(nodes);
    }

    /**
     * Update the state to serialize it.
     * @return {State} state
     */
    _serialize() {
        let state = this;

        if (state.nodes.size == 0) {
            return state;
        }

        state = state.applyRules('serialize');

        // No rule can match this node
        if (!state) {
            throw new Error(`No rule match node ${this.peek().kind}#${this.peek().type || ''}`);
        }

        // Same state cause an infinite loop
        if (state == this) {
            throw new Error('A rule returns an identical state, returns undefined instead when passing.');
        }

        return state._serialize();
    }
}

module.exports = State;
