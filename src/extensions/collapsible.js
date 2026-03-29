import { Node, mergeAttributes } from '@tiptap/core'

export const CollapsibleSummary = Node.create({
  name: 'collapsibleSummary',
  content: 'inline*',
  defining: true,
  selectable: false,

  parseHTML() {
    return [{ tag: 'summary' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['summary', mergeAttributes(HTMLAttributes, { class: 'collapsible-summary' }), 0]
  },
})

export const CollapsibleContent = Node.create({
  name: 'collapsibleContent',
  content: 'block+',
  defining: true,
  selectable: false,

  parseHTML() {
    return [{ tag: 'div[data-collapsible-content]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-collapsible-content': '', class: 'collapsible-content' }), 0]
  },
})

export const Collapsible = Node.create({
  name: 'collapsible',
  group: 'block',
  content: 'collapsibleSummary collapsibleContent',
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.hasAttribute('open'),
        renderHTML: (attributes) => {
          if (!attributes.open) return {}
          return { open: '' }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'details' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes, { class: 'collapsible-block' }), 0]
  },

  addCommands() {
    return {
      insertCollapsible:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { open: true },
            content: [
              {
                type: 'collapsibleSummary',
                content: [{ type: 'text', text: 'Click to expand' }],
              },
              {
                type: 'collapsibleContent',
                content: [{ type: 'paragraph' }],
              },
            ],
          })
        },
    }
  },
})
