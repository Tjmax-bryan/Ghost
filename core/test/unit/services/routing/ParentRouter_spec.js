const should = require('should'),
    sinon = require('sinon'),
    configUtils = require('../../../utils/configUtils'),
    settingsCache = require('../../../../server/services/settings/cache'),
    common = require('../../../../server/lib/common'),
    urlService = require('../../../../server/services/url'),
    ParentRouter = require('../../../../server/services/routing/ParentRouter'),
    sandbox = sinon.sandbox.create();

describe('UNIT - services/routing/ParentRouter', function () {
    let req, res, next;

    beforeEach(function () {
        sandbox.stub(settingsCache, 'get').withArgs('permalinks').returns('/:slug/');

        sandbox.stub(common.events, 'emit');
        sandbox.stub(common.events, 'on');

        sandbox.stub(urlService.utils, 'redirect301');

        req = sandbox.stub();
        req.app = {
            _router: {
                stack: []
            }
        };

        res = sandbox.stub();
        next = sandbox.stub();

        res.locals = {};
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    describe('fn: _getSiteRouter', function () {
        it('find site router', function () {
            const parentRouter = new ParentRouter();

            req.app = {
                _router: {
                    stack: [{
                        name: 'SiteRouter'
                    }]
                }
            };

            should.exist(parentRouter._getSiteRouter(req));
        });
    });

    describe('fn: _respectDominantRouter', function () {
        it('redirect', function () {
            const parentRouter = new ParentRouter();
            parentRouter.getResourceType = sandbox.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sandbox.stub().returns('/tag/:slug/')
            };

            req.url = '/tag/bacon/';
            req.originalUrl = '/tag/bacon/';

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sandbox.stub().returns(true),
                                getRoute: sandbox.stub().returns('/channel/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(false);
            urlService.utils.redirect301.withArgs(res, '/channel/').calledOnce.should.be.true();
        });

        it('redirect with query params', function () {
            const parentRouter = new ParentRouter('tag', '/tag/:slug/');
            parentRouter.getResourceType = sandbox.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sandbox.stub().returns('/tag/:slug/')
            };

            req.url = '/tag/bacon/';
            req.originalUrl = '/tag/bacon/?a=b';

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sandbox.stub().returns(true),
                                getRoute: sandbox.stub().returns('/channel/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(false);
            urlService.utils.redirect301.withArgs(res, '/channel/?a=b').calledOnce.should.be.true();
        });

        it('redirect rss', function () {
            const parentRouter = new ParentRouter('tag', '/tag/:slug/');
            parentRouter.getResourceType = sandbox.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sandbox.stub().returns('/tag/:slug/')
            };

            req.url = '/tag/bacon/rss/';
            req.originalUrl = '/tag/bacon/rss/';

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sandbox.stub().returns(true),
                                getRoute: sandbox.stub().returns('/channel/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(false);
            urlService.utils.redirect301.withArgs(res, '/channel/rss/').calledOnce.should.be.true();
        });

        it('redirect pagination', function () {
            const parentRouter = new ParentRouter('tag', '/tag/:slug/');
            parentRouter.getResourceType = sandbox.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sandbox.stub().returns('/tag/:slug/')
            };

            req.url = '/tag/bacon/page/2/';
            req.originalUrl = '/tag/bacon/page/2/';

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sandbox.stub().returns(true),
                                getRoute: sandbox.stub().returns('/channel/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(false);
            urlService.utils.redirect301.withArgs(res, '/channel/page/2/').calledOnce.should.be.true();
        });

        it('redirect correctly with subdirectory', function () {
            configUtils.set('url', 'http://localhost:7777/blog/');

            const parentRouter = new ParentRouter('tag', '/tag/:slug/');
            parentRouter.getResourceType = sandbox.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sandbox.stub().returns('/tag/:slug/')
            };

            req.url = '/tag/bacon/';
            req.originalUrl = '/blog/tag/bacon/';

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sandbox.stub().returns(true),
                                getRoute: sandbox.stub().returns('/channel/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(false);
            urlService.utils.redirect301.withArgs(res, '/blog/channel/').calledOnce.should.be.true();
        });

        it('no redirect: different data key', function () {
            const parentRouter = new ParentRouter('tag', '/tag/:slug/');
            parentRouter.getResourceType = sandbox.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sandbox.stub().returns('/tag/:slug/')
            };

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticRoutesRouter',
                        handle: {
                            parent: {
                                isRedirectEnabled: sandbox.stub().returns(false),
                                getRoute: sandbox.stub().returns('/channel/')
                            }
                        }
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(true);
            urlService.utils.redirect301.called.should.be.false();
        });

        it('no redirect: no channel defined', function () {
            const parentRouter = new ParentRouter('tag', '/tag/:slug/');
            parentRouter.getResourceType = sandbox.stub().returns('tags');
            parentRouter.permalinks = {
                getValue: sandbox.stub().returns('/tag/:slug/')
            };

            req.app._router.stack = [{
                name: 'SiteRouter',
                handle: {
                    stack: [{
                        name: 'StaticPagesRouter',
                        handle: {}
                    }]
                }
            }];

            parentRouter._respectDominantRouter(req, res, next, 'bacon');
            next.called.should.eql(true);
            urlService.utils.redirect301.called.should.be.false();
        });
    });

    describe('fn: isRedirectEnabled', function () {
        it('no data key defined', function () {
            const parentRouter = new ParentRouter();
            parentRouter.data = undefined;
            parentRouter.isRedirectEnabled('tags', 'bacon').should.be.false();
        });

        it('no data key defined', function () {
            const parentRouter = new ParentRouter();
            parentRouter.data = {query: {}, router: {}};
            should.not.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('no redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: true}]
                }
            };

            should.not.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('no redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: true, slug: 'cheese'}]
                }
            };

            should.not.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('no redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: false, slug: 'bacon'}]
                }
            };

            should.not.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: true, slug: 'bacon'}]
                }
            };

            should.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    pages: [{redirect: true, slug: 'home'}]
                }
            };

            should.exist(parentRouter.isRedirectEnabled('pages', 'home'));
        });
    });
});
