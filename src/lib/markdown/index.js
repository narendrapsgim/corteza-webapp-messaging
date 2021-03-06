'use strict'

import hljs from 'highlight.js'
import 'highlight.js/styles/xcode.css'
import MarkdownIt from 'markdown-it'
import MarkdownItV from 'markdown-it-v'
import internalLinks from './internal-links'

const md = MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  highlight: function (str, lang) {
    // If lang is specified
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value
      } catch (__) {}
    } else {
      // try to guess the lang
      // try {
      //   return hljs.highlightAuto(str).value
      // } catch (__) {}
    }
    // Plain text
    return md.utils.escapeHtml(str)
  },
})

md.use(MarkdownItV)
md.use(internalLinks)

const linkRenderer = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  // If you are sure other plugins can't add `target` - drop check below
  var aIndex = tokens[idx].attrIndex('target')

  if (aIndex < 0) {
    // add new attribute
    tokens[idx].attrPush(['target', '_blank'])
  } else {
    // replace value of existing attr
    tokens[idx].attrs[aIndex][1] = '_blank'
  }

  // pass token to default renderer.
  return linkRenderer(tokens, idx, options, env, self)
}

export default (markdownText) => md.render(markdownText)
