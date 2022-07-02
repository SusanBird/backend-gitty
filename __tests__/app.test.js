const pool = require('../lib/utils/pool');
const setup = require('../data/setup');
const request = require('supertest');
const app = require('../lib/app');
const Post = require('../lib/models/Post');

jest.mock('../lib/services/github');

describe('github oauth routes', () => {
  beforeEach(() => {
    return setup(pool);
  });

  it('should redirect to the github oauth page upon login', async () => {
    const res = await request(app).get('/api/v1/github/login');

    expect(res.header.location).toMatch(
      `https://github.com/login/oauth/authorize?client_id=${process.env.GH_CLIENT_ID}&scope=user&redirect_`
    );
  });

  it('should login and redirect users to /api/v1/github/callback', async () => {
    const res = await request
      .agent(app)
      .get('/api/v1/github/callback?code=42')
      .redirects(1);

    expect(res.body).toEqual({
      id: expect.any(String),
      username: 'fake_github_user',
      email: 'not-real@example.com',
      avatar: expect.any(String),
      iat: expect.any(Number),
      exp: expect.any(Number),
    });
  });

  it('/api/v1/posts should return a list of posts', async () => {
    const agent = request.agent(app);
    await agent.get('/api/v1/github/callback?code=42');
    const postData = Post.getAll();
    const expected = (await postData).map((post) => {
      return { id: post.id, post: post.post };
    });

    const res = await agent.get('/api/v1/posts');
    expect(res.body).toEqual(expected);
  });

  it('POST /posts should create a new post', async () => {
    const agent = request.agent(app);
    await agent.get('/api/v1/github/callback?code=42');
    const res = await agent.post('/api/v1/posts').send({
      description: 'the most secretest secret ever'
    });
    expect(res.status).toEqual(200);
    expect(res.body.id).toEqual('1');
    expect(res.body.description).toEqual('the most secretest secret ever');
  });

  afterAll(() => {
    pool.end();
  });
});
