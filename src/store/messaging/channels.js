var BigNumber = require('bignumber.js')

// initial state
const state = {
  current: null,
  list: [],
  lastMessages: [] // set of channelID-messageId pairs
}

// getters
const getters = {
  // Finds last message id for a specific channel
  lastMessage: (state) => (channelID) => {
    const ci = state.lastMessages.findIndex(lm => lm.channelID === channelID)
    return ci < 0 ? 0 : state.lastMessages[ci].messageId
  },
  current: (state) => state.list.find(ch => ch.ID === state.current),
  list: (state) => state.list
}

// actions
const actions = {
  setCurrentById ({commit}, channelID) {
    commit('setCurrent', channelID)
  },

  setLastMessageId ({commit, state}, {channelID, messageId}) {
    let ci = state.lastMessages.findIndex(lm => lm.channelID === channelID)

    if (ci < 0 || (new BigNumber(messageId)).isGreaterThan(new BigNumber(state.lastMessages[ci].messageId))) {
      commit('updateLastMessage', {channelID, messageId})
    }
  },

  resetList ({commit}, list) {
    commit('resetList', list)
  },

  updateList ({commit}, channel) {
    commit('updateList', channel)
  },

  removeFromList ({commit}, channel) {
    commit('removeFromList', channel)
  }
}

// mutations
const mutations = {
  setCurrent (state, channelID) {
    state.current = channelID
  },

  resetList (state, channels) {
    state.list = channels
  },

  updateList (state, channel) {
    const l = state.list
    const i = l.findIndex(c => c.ID === channel.ID)

    if (i === -1) {
      l.unshift(channel)
    } else {
      l[i] = channel
    }

    state.list = [...l]
  },

  removeFromList (state, channel) {
    state.list = [...state.list.filter(ch => channel.ID !== ch.ID)]
  },

  updateLastMessage (state, {channelID, messageId}) {
    const ci = state.lastMessages.findIndex(lm => lm.channelID === channelID)
    if (ci < 0) {
      state.lastMessages.push({channelID, messageId})
    } else {
      state.lastMessages.splice(ci, 1, {channelID, messageId})
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}