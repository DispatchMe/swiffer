var retryStrategies = require('./retryStrategies');

describe('Retry strategies', function() {
  describe('ExponentialBackoff', function() {
    it('should give correct function responses', function() {
      var strat = new retryStrategies.ExponentialBackoff(2, 5);
      expect(strat.getBackoffTime(4)).toEqual(16);
      expect(strat.shouldRetry(5)).toEqual(false);
      expect(strat.shouldRetry(4)).toEqual(true);
    });
  });

  describe('ConstantBackoff', function() {
    it('should give correct function responses', function() {
      var strat = new retryStrategies.ConstantBackoff(2, 5);
      expect(strat.getBackoffTime(3)).toEqual(2);
      expect(strat.getBackoffTime(4)).toEqual(2);
      expect(strat.shouldRetry(5)).toEqual(false);
      expect(strat.shouldRetry(4)).toEqual(true);
    });
  });

  describe('Immediate', function() {
    it('should give correct function responses', function() {
      var strat = new retryStrategies.Immediate(5);
      expect(strat.getBackoffTime(3)).toEqual(0);
      expect(strat.getBackoffTime(4)).toEqual(0);
      expect(strat.shouldRetry(5)).toEqual(false);
      expect(strat.shouldRetry(4)).toEqual(true);
    });
  });

  describe('None', function() {
    it('should give correct function responses', function() {
      var strat = new retryStrategies.None();
      expect(strat.shouldRetry(1)).toEqual(false);
      expect(strat.shouldRetry(4)).toEqual(false);
    });
  });
});
