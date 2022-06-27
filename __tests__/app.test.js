const pool = require('../lib/utils/pool');
const setup = require('../data/setup');
const request = require('supertest');
const app = require('../lib/app');
const Post = require('../lib/models/Post')

jest.mock('../lib/services/github');

describe('github oauth routes', () => {
  beforeEach(() => {
    return setup(pool);
  });

  it('should redirect to the github oauth page upon login', async () => {
    const res = await request(app).get('/api/v1/github/login');

    expect(res.header.location).toMatch(
      /https:\/\/github.com\/login\/oauth\/authorize\?client_id=[\w\d]+&scope=user&redirect_uri=http:\/\/localhost:7890\/api\/v1\/github\/callback/i
    );
  });

  it('should login and redirect users to /api/v1/github/dashboard', async () => {
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

  it('/posts should return a list of posts', async () => {
    const agent = await request.agent(app).get('/api/v1/github/callback?code=42');
    const postData = Post.getAll();
    const expected = (await postData).map((post) => {
      return { id: post.id, post: post.post };
    });

    const res = await agent.get('/api/v1/posts');
    expect(agent.body).toEqual(expected);
  });

  it('POST /posts should create a new post', async () => {
    const agent = await (await request.agent(app).post('/posts')).setEncoding({
      id: '4545',
      post: 'the most secretest secret ever'
    });
    expect(agent.status).toEqual(200);
    expect(agent.body.id).toEqual('4545');
    expect(agent.body.post).toEqual('the most secretest secret ever')
  });

  afterAll(() => {
    pool.end();
  });
});
