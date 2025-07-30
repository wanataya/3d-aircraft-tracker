# contributing to aircraft tracker 3d

first off, thanks for taking the time to contribute!

## how to contribute

### reporting bugs

before creating bug reports, please check the existing issues to avoid duplicates. when creating a bug report, include:

- clear description of what you expected vs what happened
- steps to reproduce the behavior
- screenshots if applicable
- environment details (os, node.js version, browser)
- console errors if any

### suggesting features

feature requests are welcome! please:

- check if the feature has already been suggested
- provide a clear description of the feature
- explain why this feature would be useful
- consider the scope and complexity

### pull requests

1. fork the repository
2. create a feature branch (`git checkout -b feature/amazing-feature`)
3. make your changes
4. test your changes thoroughly
5. commit with clear messages (`git commit -m 'Add amazing feature'`)
6. push to your branch (`git push origin feature/amazing-feature`)
7. open a pull request

### development setup

```bash
# clone the repository
git clone https://github.com/wanataya/aircraft-tracker-3d.git
cd aircraft-tracker-3d

# install dependencies
npm install

# start development server
npm run dev

# start tcp proxy (for real sensor testing)
node tcp-proxy-server.js
```

### code style

- use consistent naming conventions
- add comments for complex logic
- follow vue.js style guide for components
- use meaningful commit messages

### testing

before submitting:

- test in simulation mode
- test with real sensor (if available)
- check responsive design
- verify no console errors
- test on multiple browsers

### areas we need help

- map enhancements - better markers, layers, controls
- data visualization - charts, statistics, analytics
- ui/ux improvements - better design, accessibility
- performance - optimization, caching, efficiency
- mobile experience - better responsive design
- testing - unit tests, integration tests
- documentation - guides, api docs, tutorials

### questions?

- open a [discussion](https://github.com/wanataya/aircraft-tracker-3d/discussions)
- create an [issue](https://github.com/wanataya/aircraft-tracker-3d/issues)
- check existing [documentation](README.md)

## code of conduct

please be respectful and constructive in all interactions. we're all here to learn and improve the project together.

---

**thanks for contributing!**
