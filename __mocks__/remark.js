module.exports = {
  remark: () => ({
    use: () => ({
      processSync: () => ({ toString: () => '' }),
    }),
  }),
}
