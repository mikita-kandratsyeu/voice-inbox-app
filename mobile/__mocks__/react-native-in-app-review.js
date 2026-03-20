module.exports = {
  __esModule: true,
  default: class InAppReview {
    static isAvailable() {
      return true;
    }

    static RequestInAppReview() {
      return Promise.resolve(true);
    }
  },
};
