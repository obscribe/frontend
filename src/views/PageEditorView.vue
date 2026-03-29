<script setup>
import { ref, computed, onBeforeUnmount, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Typography } from '@tiptap/extension-typography'
import { CharacterCount } from '@tiptap/extension-character-count'
import { Youtube } from '@tiptap/extension-youtube'
import { common, createLowlight } from 'lowlight'
import DOMPurify from 'dompurify'

import { Collapsible, CollapsibleSummary, CollapsibleContent } from '@/extensions/collapsible'
import { DragHandle } from '@/extensions/dragHandle'
import Section from '@/extensions/section'
import { useNotebookStore } from '@/stores/notebooks'
import { usePageStore } from '@/stores/pages'
import { useVaultStore } from '@/stores/vault'

const lowlight = createLowlight(common)

const route = useRoute()
const router = useRouter()
const notebookStore = useNotebookStore()
const pageStore = usePageStore()
const vaultStore = useVaultStore()

const notebookId = computed(() => route.params.notebookId)
const pageId = computed(() => route.params.pageId)
const notebook = computed(() =>
  notebookStore.notebooks.find((n) => n.id === String(notebookId.value))
)
const page = computed(() =>
  pageStore.pages.find((p) => p.id === String(pageId.value))
)

const pageTitle = ref('')
const wordCount = ref(0)
const charCount = ref(0)
const saveStatus = ref('Saved')
const isFocusMode = ref(false)
const isEditingTitle = ref(false)
const titleInput = ref(null)
const pageLoaded = ref(false)

// Dropdown state
const showTableMenu = ref(false)
const showHighlightPicker = ref(false)
const showColorPicker = ref(false)
const showAlignMenu = ref(false)

const highlightColors = [
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Green', color: '#bbf7d0' },
  { name: 'Blue', color: '#bfdbfe' },
  { name: 'Pink', color: '#fbcfe8' },
  { name: 'Orange', color: '#fed7aa' },
]

const textColors = [
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Gray', color: '#6b7280' },
]

// Close dropdowns on outside click
function closeAllDropdowns() {
  showTableMenu.value = false
  showHighlightPicker.value = false
  showColorPicker.value = false
  showAlignMenu.value = false
}

// Auto-save debounce
let saveTimeout = null

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveStatus.value = 'Unsaved changes'
  saveTimeout = setTimeout(() => doSave(), 3000)
}

async function doSave() {
  if (!pageId.value || !editor.value) return
  saveStatus.value = 'Saving…'
  try {
    const content = editor.value.getHTML()
    const text = editor.value.getText()
    const wc = text.split(/\s+/).filter((w) => w.length > 0).length

    // Encrypt content with vault key before sending to server
    if (vaultStore.isUnlocked) {
      const { ciphertext, iv } = await vaultStore.encryptContent(content)
      await pageStore.updatePage(pageId.value, {
        title: pageTitle.value || '',
        encrypted_content: ciphertext,
        content_nonce: iv,
        word_count: wc,
      })
    } else {
      // Vault locked — save plaintext as fallback (shouldn't happen in normal flow)
      await pageStore.updatePage(pageId.value, {
        title: pageTitle.value || '',
        encrypted_content: content,
        word_count: wc,
      })
    }
    saveStatus.value = 'Saved'
  } catch {
    saveStatus.value = 'Error saving'
  }
}

// Load page data from API
onMounted(async () => {
  if (!notebookStore.notebooks.length) {
    await notebookStore.fetchNotebooks()
  }

  // Try to restore vault from sessionStorage (page refresh)
  if (!vaultStore.isUnlocked) {
    await vaultStore.tryRestoreFromSession()
  }

  if (pageId.value) {
    try {
      const fetched = await pageStore.fetchPage(pageId.value)
      pageTitle.value = fetched.title || ''
      wordCount.value = fetched.wordCount || 0
      pageLoaded.value = true

      if (editor.value && fetched.encryptedContent) {
        let content = fetched.encryptedContent

        // Decrypt if vault is unlocked and content has a nonce (encrypted)
        if (vaultStore.isUnlocked && fetched.contentNonce) {
          try {
            content = await vaultStore.decryptContent(fetched.encryptedContent, fetched.contentNonce)
          } catch (decryptErr) {
            console.error('Decryption failed:', decryptErr)
            content = '<p><em>⚠️ Unable to decrypt this note. The encryption key may have changed.</em></p>'
          }
        }

        const clean = DOMPurify.sanitize(content)
        editor.value.commands.setContent(clean)
      }
    } catch {
      router.push(`/notebook/${notebookId.value}`)
    }
  }

  // Close dropdowns on click outside
  document.addEventListener('click', handleGlobalClick)
})

function handleGlobalClick(e) {
  if (!e.target.closest('.toolbar-dropdown')) {
    closeAllDropdowns()
  }
}

// Save title changes
let titleSaveTimeout = null
watch(pageTitle, () => {
  if (!pageLoaded.value) return
  if (titleSaveTimeout) clearTimeout(titleSaveTimeout)
  titleSaveTimeout = setTimeout(() => doSave(), 2000)
})

// Slash command state
const showSlashMenu = ref(false)
const slashMenuPos = ref({ top: 0, left: 0 })
const slashFilter = ref('')
const selectedSlashIndex = ref(0)

// YouTube prompt
const showYoutubePrompt = ref(false)
const youtubeUrl = ref('')

function insertYoutube() {
  if (!youtubeUrl.value) return
  editor.value.commands.setYoutubeVideo({ src: youtubeUrl.value })
  youtubeUrl.value = ''
  showYoutubePrompt.value = false
}

const slashCommands = [
  { label: 'Heading 1', icon: 'H1', description: 'Large heading', action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2', icon: 'H2', description: 'Medium heading', action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3', icon: 'H3', description: 'Small heading', action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Bullet List', icon: '•', description: 'Unordered list', action: (ed) => ed.chain().focus().toggleBulletList().run() },
  { label: 'Ordered List', icon: '1.', description: 'Numbered list', action: (ed) => ed.chain().focus().toggleOrderedList().run() },
  { label: 'Checklist', icon: '☑', description: 'Task list with checkboxes', action: (ed) => ed.chain().focus().toggleTaskList().run() },
  { label: 'Blockquote', icon: '❝', description: 'Quote block', action: (ed) => ed.chain().focus().toggleBlockquote().run() },
  { label: 'Code Block', icon: '</>', description: 'Syntax highlighted code', action: (ed) => ed.chain().focus().toggleCodeBlock().run() },
  { label: 'Divider', icon: '—', description: 'Horizontal rule', action: (ed) => ed.chain().focus().setHorizontalRule().run() },
  { label: 'Table', icon: '▦', description: 'Insert 3×3 table', action: (ed) => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { label: 'Collapsible', icon: '▸', description: 'Collapsible section', action: (ed) => ed.chain().focus().insertCollapsible().run() },
  { label: 'YouTube', icon: '▶', description: 'Embed YouTube video', action: () => { showYoutubePrompt.value = true } },
  { label: 'Highlight', icon: '🖍', description: 'Toggle highlight', action: (ed) => ed.chain().focus().toggleHighlight({ color: '#fef08a' }).run() },
  { label: 'Section', icon: '§', description: 'Create a named section', action: (ed) => ed.chain().focus().insertSection().run() },
]

const filteredSlashCommands = computed(() => {
  if (!slashFilter.value) return slashCommands
  const q = slashFilter.value.toLowerCase()
  return slashCommands.filter((c) => c.label.toLowerCase().includes(q))
})

function executeSlashCommand(cmd) {
  const { state } = editor.value
  const { from } = state.selection
  const textBefore = state.doc.textBetween(Math.max(0, from - 20), from, '')
  const slashIndex = textBefore.lastIndexOf('/')
  if (slashIndex !== -1) {
    const deleteFrom = from - (textBefore.length - slashIndex)
    editor.value.chain().focus().deleteRange({ from: deleteFrom, to: from }).run()
  }
  cmd.action(editor.value)
  closeSlashMenu()
}

function closeSlashMenu() {
  showSlashMenu.value = false
  slashFilter.value = ''
  selectedSlashIndex.value = 0
}

// Check if cursor is inside a table
const isInTable = computed(() => {
  if (!editor.value) return false
  return editor.value.isActive('table')
})

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      horizontalRule: false,
      codeBlock: false, // replaced by CodeBlockLowlight
    }),
    Placeholder.configure({
      placeholder: ({ node, editor }) => {
        if (node.type.name === 'heading') {
          const level = node.attrs.level
          return `Heading ${level}`
        }
        if (node.type.name === 'paragraph') {
          // Check if editor is empty — show section hint
          if (editor && editor.isEmpty) {
            return 'Start writing, or type /section to create a section…'
          }
          return 'Type / for commands…'
        }
        return ''
      },
      includeChildren: true,
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    HorizontalRule,
    Image,
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: 'tiptap-table' },
    }),
    TableRow,
    TableCell,
    TableHeader,
    CodeBlockLowlight.configure({ lowlight }),
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Color,
    Subscript,
    Superscript,
    Typography,
    CharacterCount,
    Youtube.configure({
      HTMLAttributes: { class: 'tiptap-youtube' },
      inline: false,
      width: 640,
      height: 360,
    }),
    Collapsible,
    CollapsibleSummary,
    CollapsibleContent,
    DragHandle,
    Section,
  ],
  content: '',
  onUpdate: ({ editor: ed }) => {
    const text = ed.getText()
    wordCount.value = text.split(/\s+/).filter((w) => w.length > 0).length
    charCount.value = ed.storage.characterCount.characters()

    if (pageLoaded.value) {
      scheduleSave()
    }

    // Slash command detection
    const { state } = ed
    const { from } = state.selection
    const textBefore = state.doc.textBetween(Math.max(0, from - 20), from, '')
    const slashMatch = textBefore.match(/\/([a-zA-Z]*)$/)

    if (slashMatch) {
      slashFilter.value = slashMatch[1]
      selectedSlashIndex.value = 0

      const coords = ed.view.coordsAtPos(from)
      const editorRect = ed.view.dom.closest('.editor-content')?.getBoundingClientRect() || { top: 0, left: 0 }
      slashMenuPos.value = {
        top: coords.bottom - editorRect.top + 4,
        left: coords.left - editorRect.left,
      }
      showSlashMenu.value = true
    } else {
      if (showSlashMenu.value) closeSlashMenu()
    }
  },
  editorProps: {
    attributes: { class: 'tiptap-prose' },
    handleKeyDown: (view, event) => {
      if (!showSlashMenu.value) return false

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        selectedSlashIndex.value = Math.min(
          selectedSlashIndex.value + 1,
          filteredSlashCommands.value.length - 1
        )
        return true
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        selectedSlashIndex.value = Math.max(selectedSlashIndex.value - 1, 0)
        return true
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const cmd = filteredSlashCommands.value[selectedSlashIndex.value]
        if (cmd) executeSlashCommand(cmd)
        return true
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        closeSlashMenu()
        return true
      }
      return false
    },
  },
})

onBeforeUnmount(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    doSave()
  }
  if (titleSaveTimeout) clearTimeout(titleSaveTimeout)
  editor.value?.destroy()
  document.removeEventListener('click', handleGlobalClick)
})

function goBack() {
  router.push(`/notebook/${notebookId.value}`)
}

function toggleFocusMode() {
  isFocusMode.value = !isFocusMode.value
}

function startEditTitle() {
  isEditingTitle.value = true
  setTimeout(() => titleInput.value?.focus(), 0)
}

function finishEditTitle() {
  isEditingTitle.value = false
}

function setHighlight(color) {
  editor.value.chain().focus().toggleHighlight({ color }).run()
  showHighlightPicker.value = false
}

function setTextColor(color) {
  editor.value.chain().focus().setColor(color).run()
  showColorPicker.value = false
}

function resetTextColor() {
  editor.value.chain().focus().unsetColor().run()
  showColorPicker.value = false
}

function setAlignment(align) {
  editor.value.chain().focus().setTextAlign(align).run()
  showAlignMenu.value = false
}

function toggleDropdown(which) {
  const wasOpen = {
    table: showTableMenu.value,
    highlight: showHighlightPicker.value,
    color: showColorPicker.value,
    align: showAlignMenu.value,
  }[which]

  closeAllDropdowns()

  if (!wasOpen) {
    if (which === 'table') showTableMenu.value = true
    if (which === 'highlight') showHighlightPicker.value = true
    if (which === 'color') showColorPicker.value = true
    if (which === 'align') showAlignMenu.value = true
  }
}

const currentAlignment = computed(() => {
  if (!editor.value) return 'left'
  if (editor.value.isActive({ textAlign: 'center' })) return 'center'
  if (editor.value.isActive({ textAlign: 'right' })) return 'right'
  if (editor.value.isActive({ textAlign: 'justify' })) return 'justify'
  return 'left'
})
</script>

<template>
  <div class="editor-view" :class="{ 'focus-mode': isFocusMode }">
    <!-- Editor toolbar -->
    <div class="editor-toolbar" v-if="editor && !isFocusMode">
      <div class="editor-toolbar__left">
        <button class="editor-toolbar__back" @click="goBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span v-if="notebook" class="editor-toolbar__breadcrumb">
          <span class="editor-toolbar__notebook-name">{{ notebook.icon }} {{ notebook.title }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </div>

      <div class="editor-toolbar__format">
        <!-- Text group -->
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()" title="Bold (⌘B)">
          <strong>B</strong>
        </button>
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()" title="Italic (⌘I)">
          <em>I</em>
        </button>
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('underline') }" @click="editor.chain().focus().toggleUnderline().run()" title="Underline (⌘U)">
          <u>U</u>
        </button>
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('strike') }" @click="editor.chain().focus().toggleStrike().run()" title="Strikethrough">
          <s>S</s>
        </button>

        <!-- Highlight -->
        <div class="toolbar-dropdown" style="position: relative;">
          <button class="editor-toolbar__btn" :class="{ active: editor.isActive('highlight') }" @click.stop="toggleDropdown('highlight')" title="Highlight">
            <span style="background: #fef08a; color: #000; padding: 0 3px; border-radius: 2px; font-size: 0.75rem; font-weight: 700;">H</span>
          </button>
          <div v-if="showHighlightPicker" class="toolbar-dropdown__menu toolbar-dropdown__colors">
            <button v-for="c in highlightColors" :key="c.color" class="toolbar-dropdown__color-btn" :style="{ background: c.color }" :title="c.name" @click.stop="setHighlight(c.color)" />
            <button class="toolbar-dropdown__color-reset" @click.stop="editor.chain().focus().unsetHighlight().run(); showHighlightPicker = false">Remove</button>
          </div>
        </div>

        <!-- Text Color -->
        <div class="toolbar-dropdown" style="position: relative;">
          <button class="editor-toolbar__btn" @click.stop="toggleDropdown('color')" title="Text color">
            <span style="font-weight: 700; font-size: 0.825rem;">A</span>
            <span style="display: block; height: 3px; width: 14px; background: var(--accent); border-radius: 1px; margin-top: 1px;" />
          </button>
          <div v-if="showColorPicker" class="toolbar-dropdown__menu toolbar-dropdown__colors">
            <button v-for="c in textColors" :key="c.color" class="toolbar-dropdown__color-btn" :style="{ background: c.color }" :title="c.name" @click.stop="setTextColor(c.color)" />
            <button class="toolbar-dropdown__color-reset" @click.stop="resetTextColor()">Default</button>
          </div>
        </div>

        <span class="editor-toolbar__divider" />

        <!-- Structure group -->
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('heading', { level: 1 }) }" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" title="Heading 1">
          H1
        </button>
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('heading', { level: 2 }) }" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" title="Heading 2">
          H2
        </button>
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('blockquote') }" @click="editor.chain().focus().toggleBlockquote().run()" title="Quote">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
          </svg>
        </button>
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('codeBlock') }" @click="editor.chain().focus().toggleCodeBlock().run()" title="Code block">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
        </button>
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()" title="Bullet list">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('orderedList') }" @click="editor.chain().focus().toggleOrderedList().run()" title="Ordered list">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
            <text x="3" y="7" font-size="6" fill="currentColor" font-weight="bold">1</text>
            <text x="3" y="13" font-size="6" fill="currentColor" font-weight="bold">2</text>
            <text x="3" y="19" font-size="6" fill="currentColor" font-weight="bold">3</text>
          </svg>
        </button>
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('taskList') }" @click="editor.chain().focus().toggleTaskList().run()" title="Checklist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="5" width="6" height="6" rx="1" /><polyline points="5 8 6 9 8 6" />
            <line x1="13" y1="8" x2="21" y2="8" /><line x1="13" y1="16" x2="21" y2="16" />
            <rect x="3" y="13" width="6" height="6" rx="1" />
          </svg>
        </button>

        <span class="editor-toolbar__divider" />

        <!-- Insert group -->
        <div class="toolbar-dropdown" style="position: relative;">
          <button class="editor-toolbar__btn" :class="{ active: editor.isActive('table') }" @click.stop="toggleDropdown('table')" title="Table">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
          <div v-if="showTableMenu" class="toolbar-dropdown__menu">
            <button class="toolbar-dropdown__item" @click.stop="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); showTableMenu = false">Insert Table (3×3)</button>
            <template v-if="isInTable">
              <div class="toolbar-dropdown__separator" />
              <button class="toolbar-dropdown__item" @click.stop="editor.chain().focus().addRowBefore().run(); showTableMenu = false">Add Row Before</button>
              <button class="toolbar-dropdown__item" @click.stop="editor.chain().focus().addRowAfter().run(); showTableMenu = false">Add Row After</button>
              <button class="toolbar-dropdown__item" @click.stop="editor.chain().focus().addColumnBefore().run(); showTableMenu = false">Add Column Before</button>
              <button class="toolbar-dropdown__item" @click.stop="editor.chain().focus().addColumnAfter().run(); showTableMenu = false">Add Column After</button>
              <div class="toolbar-dropdown__separator" />
              <button class="toolbar-dropdown__item" @click.stop="editor.chain().focus().deleteRow().run(); showTableMenu = false">Delete Row</button>
              <button class="toolbar-dropdown__item" @click.stop="editor.chain().focus().deleteColumn().run(); showTableMenu = false">Delete Column</button>
              <button class="toolbar-dropdown__item" @click.stop="editor.chain().focus().mergeCells().run(); showTableMenu = false">Merge Cells</button>
              <button class="toolbar-dropdown__item" @click.stop="editor.chain().focus().splitCell().run(); showTableMenu = false">Split Cell</button>
              <div class="toolbar-dropdown__separator" />
              <button class="toolbar-dropdown__item toolbar-dropdown__item--danger" @click.stop="editor.chain().focus().deleteTable().run(); showTableMenu = false">Delete Table</button>
            </template>
          </div>
        </div>

        <button class="editor-toolbar__btn" @click="editor.chain().focus().setHorizontalRule().run()" title="Divider">—</button>

        <span class="editor-toolbar__divider" />

        <!-- Align group -->
        <div class="toolbar-dropdown" style="position: relative;">
          <button class="editor-toolbar__btn" @click.stop="toggleDropdown('align')" title="Text alignment">
            <svg v-if="currentAlignment === 'left'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
            <svg v-else-if="currentAlignment === 'center'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
            <svg v-else-if="currentAlignment === 'right'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div v-if="showAlignMenu" class="toolbar-dropdown__menu">
            <button class="toolbar-dropdown__item" :class="{ 'toolbar-dropdown__item--active': currentAlignment === 'left' }" @click.stop="setAlignment('left')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
              Align Left
            </button>
            <button class="toolbar-dropdown__item" :class="{ 'toolbar-dropdown__item--active': currentAlignment === 'center' }" @click.stop="setAlignment('center')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
              Center
            </button>
            <button class="toolbar-dropdown__item" :class="{ 'toolbar-dropdown__item--active': currentAlignment === 'right' }" @click.stop="setAlignment('right')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
              Align Right
            </button>
            <button class="toolbar-dropdown__item" :class="{ 'toolbar-dropdown__item--active': currentAlignment === 'justify' }" @click.stop="setAlignment('justify')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              Justify
            </button>
          </div>
        </div>

        <span class="editor-toolbar__divider" />

        <!-- Format group -->
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('subscript') }" @click="editor.chain().focus().toggleSubscript().run()" title="Subscript">
          x<sub>₂</sub>
        </button>
        <button class="editor-toolbar__btn" :class="{ active: editor.isActive('superscript') }" @click="editor.chain().focus().toggleSuperscript().run()" title="Superscript">
          x<sup>²</sup>
        </button>
      </div>

      <div class="editor-toolbar__right">
        <button class="editor-toolbar__btn" @click="toggleFocusMode" title="Focus mode">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Focus mode exit button -->
    <button v-if="isFocusMode" class="editor-view__exit-focus" @click="toggleFocusMode" title="Exit focus mode">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
      </svg>
    </button>

    <!-- YouTube embed prompt -->
    <Transition name="fade">
      <div v-if="showYoutubePrompt" class="youtube-prompt-overlay" @click.self="showYoutubePrompt = false">
        <div class="youtube-prompt">
          <h3 class="youtube-prompt__title">Embed YouTube Video</h3>
          <input
            v-model="youtubeUrl"
            type="url"
            class="youtube-prompt__input"
            placeholder="https://www.youtube.com/watch?v=..."
            @keydown.enter="insertYoutube"
            autofocus
          />
          <div class="youtube-prompt__actions">
            <button class="youtube-prompt__cancel" @click="showYoutubePrompt = false">Cancel</button>
            <button class="youtube-prompt__submit" @click="insertYoutube">Embed</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Editor content -->
    <div class="editor-content">
      <div class="editor-content__inner">
        <h1
          v-if="!isEditingTitle"
          class="editor-content__title editor-content__title--display"
          @click="startEditTitle"
        >
          {{ pageTitle || 'Untitled' }}
        </h1>
        <input
          v-else
          ref="titleInput"
          v-model="pageTitle"
          type="text"
          class="editor-content__title editor-content__title--input"
          placeholder="Untitled"
          @blur="finishEditTitle"
          @keydown.enter="finishEditTitle"
        />
        <div class="tiptap-editor">
          <EditorContent :editor="editor" />

          <!-- Slash command menu -->
          <Transition name="slash-menu">
            <div
              v-if="showSlashMenu && filteredSlashCommands.length"
              class="slash-menu"
              :style="{ top: slashMenuPos.top + 'px', left: slashMenuPos.left + 'px' }"
            >
              <div class="slash-menu__label">Commands</div>
              <button
                v-for="(cmd, i) in filteredSlashCommands"
                :key="cmd.label"
                class="slash-menu__item"
                :class="{ 'slash-menu__item--selected': i === selectedSlashIndex }"
                @mousedown.prevent="executeSlashCommand(cmd)"
                @mouseenter="selectedSlashIndex = i"
              >
                <span class="slash-menu__icon">{{ cmd.icon }}</span>
                <div class="slash-menu__text">
                  <span class="slash-menu__name">{{ cmd.label }}</span>
                  <span class="slash-menu__desc">{{ cmd.description }}</span>
                </div>
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Status bar -->
    <div class="editor-status" v-if="!isFocusMode">
      <span class="editor-status__item">{{ wordCount }} words · {{ charCount }} characters</span>
      <span class="editor-status__item" :class="{
        'editor-status__saving': saveStatus === 'Saving…',
        'editor-status__error': saveStatus === 'Error saving',
        'editor-status__unsaved': saveStatus === 'Unsaved changes',
      }">{{ saveStatus }}</span>
      <span class="editor-status__item editor-status__encrypted" v-if="vaultStore.isUnlocked">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
        </svg>
        Encrypted &amp; saved
      </span>
      <span class="editor-status__item editor-status__unencrypted" v-else>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
        </svg>
        Vault locked — enter password to access notes
      </span>
    </div>
  </div>
</template>

<style scoped>
.editor-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--topbar-height));
  margin: -2rem;
  overflow: hidden;
}

.editor-view.focus-mode {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: var(--bg-primary);
  height: 100vh;
  margin: 0;
}

/* Toolbar */
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  margin-top: 0.5rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-primary);
  flex-shrink: 0;
  gap: 1rem;
}

.editor-toolbar__left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.editor-toolbar__back {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.375rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  transition: all var(--transition-fast);
}

.editor-toolbar__back:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.editor-toolbar__breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.825rem;
  color: var(--text-tertiary);
}

.editor-toolbar__notebook-name {
  color: var(--text-secondary);
}

.editor-toolbar__format {
  display: flex;
  align-items: center;
  gap: 2px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  flex-shrink: 1;
  min-width: 0;
}

.editor-toolbar__format::-webkit-scrollbar {
  display: none;
}

.editor-toolbar__btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.375rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.825rem;
  font-family: var(--font-ui);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.editor-toolbar__btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.editor-toolbar__btn.active {
  color: var(--accent-text);
  background: var(--accent-subtle);
}

.editor-toolbar__divider {
  width: 1px;
  height: 18px;
  background: var(--border);
  margin: 0 0.375rem;
  flex-shrink: 0;
}

.editor-toolbar__right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* Toolbar dropdowns */
.toolbar-dropdown__menu {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 45;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 0.375rem;
  min-width: 180px;
  margin-top: 4px;
  max-width: calc(100vw - 2rem);
}

.toolbar-dropdown__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  width: 100%;
  text-align: left;
  font-family: var(--font-ui);
  font-size: 0.8rem;
  color: var(--text-secondary);
  transition: background var(--transition-fast);
  white-space: nowrap;
}

.toolbar-dropdown__item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toolbar-dropdown__item--active {
  color: var(--accent-text);
}

.toolbar-dropdown__item--danger {
  color: var(--danger);
}

.toolbar-dropdown__item--danger:hover {
  background: rgba(196, 85, 85, 0.1);
}

.toolbar-dropdown__separator {
  height: 1px;
  background: var(--border);
  margin: 0.25rem 0;
}

.toolbar-dropdown__colors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0.5rem;
  min-width: 140px;
}

.toolbar-dropdown__color-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.toolbar-dropdown__color-btn:hover {
  border-color: var(--text-primary);
  transform: scale(1.15);
}

.toolbar-dropdown__color-reset {
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  font-size: 0.725rem;
  font-family: var(--font-ui);
  padding: 0.25rem;
  text-align: center;
  margin-top: 4px;
  border-radius: var(--radius-sm);
}

.toolbar-dropdown__color-reset:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* YouTube prompt */
.youtube-prompt-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.youtube-prompt {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  width: 90%;
  max-width: 420px;
  box-shadow: var(--shadow-lg);
}

.youtube-prompt__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem;
}

.youtube-prompt__input {
  width: 100%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  font-family: var(--font-ui);
  outline: none;
}

.youtube-prompt__input:focus {
  border-color: var(--accent);
}

.youtube-prompt__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.youtube-prompt__cancel {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  color: var(--text-secondary);
  font-family: var(--font-ui);
  font-size: 0.825rem;
}

.youtube-prompt__submit {
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  color: white;
  font-family: var(--font-ui);
  font-size: 0.825rem;
  font-weight: 600;
}

.youtube-prompt__submit:hover {
  background: var(--accent-hover);
}

/* Focus mode exit */
.editor-view__exit-focus {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 51;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  opacity: 0.3;
  transition: opacity var(--transition-fast);
}

.editor-view__exit-focus:hover {
  opacity: 1;
}

/* Editor content */
.editor-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  position: relative;
}

.editor-content__inner {
  width: 100%;
  max-width: 680px;
  padding: 3rem 2rem 6rem;
}

.editor-content__title--display {
  width: 100%;
  font-family: var(--font-editor);
  font-size: 2.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1.5rem;
  letter-spacing: -0.02em;
  line-height: 1.2;
  cursor: text;
  border-radius: var(--radius-sm);
  padding: 0.125rem 0;
  transition: color var(--transition-fast);
}

.editor-content__title--display:hover {
  color: var(--accent-text);
}

.editor-content__title--input {
  width: 100%;
  background: none;
  border: none;
  border-bottom: 2px solid var(--accent);
  outline: none;
  font-family: var(--font-editor);
  font-size: 2.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
  line-height: 1.2;
  padding: 0.125rem 0;
}

.editor-content__title--input::placeholder {
  color: var(--text-muted);
}

/* Slash command menu */
.slash-menu {
  position: absolute;
  z-index: 40;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 0.375rem;
  min-width: 220px;
  max-width: 280px;
  max-height: 320px;
  overflow-y: auto;
}

.slash-menu__label {
  font-size: 0.675rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  padding: 0.375rem 0.625rem 0.25rem;
}

.slash-menu__item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.625rem;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  width: 100%;
  text-align: left;
  font-family: var(--font-ui);
  transition: background var(--transition-fast);
}

.slash-menu__item:hover,
.slash-menu__item--selected {
  background: var(--bg-hover);
}

.slash-menu__icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.slash-menu__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.slash-menu__name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
}

.slash-menu__desc {
  font-size: 0.725rem;
  color: var(--text-tertiary);
}

.slash-menu-enter-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.slash-menu-leave-active {
  transition: opacity 0.08s ease, transform 0.08s ease;
}
.slash-menu-enter-from,
.slash-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Status bar */
.editor-status {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.5rem 1.5rem;
  border-top: 1px solid var(--border);
  background: var(--bg-primary);
  flex-shrink: 0;
  min-height: 36px;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.editor-status__item {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.editor-status__saving {
  color: var(--accent) !important;
}

.editor-status__error {
  color: #e54545 !important;
}

.editor-status__unsaved {
  color: #d4914e !important;
}

.editor-status__encrypted {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--accent);
  margin-left: auto;
}

.editor-status__unencrypted {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #d4914e;
  margin-left: auto;
}

/* ─── Mobile responsive ─── */
@media (max-width: 767px) {
  .editor-view {
    margin: -1rem;
  }

  .editor-toolbar {
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
    overflow: visible;
    margin-top: 0.25rem;
  }

  .editor-toolbar__breadcrumb {
    display: none;
  }

  .editor-toolbar__format {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 2px;
  }

  .editor-toolbar__btn {
    min-width: 36px;
    min-height: 36px;
    padding: 0.375rem;
  }

  .editor-toolbar__back {
    min-width: 36px;
    min-height: 36px;
  }

  .editor-content__inner {
    padding: 1.5rem 1rem 4rem;
    max-width: 100%;
  }

  .editor-content__title--display,
  .editor-content__title--input {
    font-size: 1.5rem;
  }

  .editor-status {
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.7rem;
  }

  .editor-status__item {
    font-size: 0.7rem;
  }

  .editor-status__encrypted {
    margin-left: auto;
  }

  .slash-menu {
    max-width: calc(100vw - 2rem);
    left: 1rem !important;
    right: 1rem;
  }

  .toolbar-dropdown__menu {
    left: auto;
    right: 0;
    transform: none;
    max-width: calc(100vw - 1.5rem);
  }

  .toolbar-dropdown__colors {
    min-width: auto;
  }
}

@media (max-width: 374px) {
  .editor-status {
    gap: 0.375rem;
  }

  .editor-status__item {
    font-size: 0.65rem;
  }

  .editor-content__title--display,
  .editor-content__title--input {
    font-size: 1.25rem;
  }
}
</style>
