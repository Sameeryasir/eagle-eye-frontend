const stub = {
  addListener() {},
  removeListeners() {},
  subscribeToTopicAsync() {
    return Promise.resolve(null);
  },
  unsubscribeFromTopicAsync() {
    return Promise.resolve(null);
  },
};

export default stub;
