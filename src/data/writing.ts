export type Post = {
  id: string
  title: string
  blurb: string
  topic: string
  href: string
}

export const posts: Post[] = [
  {
    id: 'useeffect-lifecycle',
    title: 'Component lifecycle with the useEffect hook in React',
    blurb:
      'How mount, update and unmount map onto a single hook — and what the dependency array is really doing when the old lifecycle methods disappear.',
    topic: 'React',
    href: 'https://medium.com/@mdirfankhan98455/component-lifecycle-with-useeffect-hook-in-react-js-293d1b431e1a',
  },
  {
    id: 'mongodb-triggers',
    title: 'What is a MongoDB trigger?',
    blurb:
      'A plain-language walkthrough of database, scheduled and authentication triggers, and when reacting inside the database beats reacting in your service.',
    topic: 'MongoDB',
    href: 'https://medium.com/@mdirfankhan98455/what-is-mongodb-trigger-f8828397ccd0',
  },
  {
    id: 'webpack-demystified',
    title: 'Webpack demystified',
    blurb:
      'Entry, output, loaders, plugins and the dependency graph — what the bundler actually does between your source files and the bundle you ship.',
    topic: 'Tooling',
    href: 'https://medium.com/@mdirfankhan98455/webpack-demystified-47e0789df5f0',
  },
]
