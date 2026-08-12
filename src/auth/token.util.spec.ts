import { generateOpaqueToken, hashToken } from './token.util';

describe('token.util', () => {
  it('generates a unique token on each call', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toEqual(b);
  });

  it('hashes the same token to the same value', () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).toEqual(hashToken(token));
  });

  it('hashes different tokens to different values', () => {
    expect(hashToken(generateOpaqueToken())).not.toEqual(hashToken(generateOpaqueToken()));
  });
});
