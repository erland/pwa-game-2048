describe('smoke', () => {
  it('can import core module and has newGame()', async () => {
    const core = await import('../game/core');
    expect(typeof core.newGame).toBe('function');
  });
});
