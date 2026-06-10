import { defaultSchema } from 'hast-util-sanitize';
import type { Schema } from 'hast-util-sanitize';

type AttrList = NonNullable<Schema['attributes']>[string];

function isClassNameAttr(attr: AttrList[number]): boolean {
  return attr === 'className' || (Array.isArray(attr) && attr[0] === 'className');
}

/** Replace tag-specific class whitelists (e.g. ul → contains-task-list only) with open className. */
function withClassName(tag: string): AttrList {
  const inherited = defaultSchema.attributes?.[tag] ?? defaultSchema.attributes?.['*'] ?? [];
  const list = (Array.isArray(inherited) ? [...inherited] : []).filter((a) => !isClassNameAttr(a));
  list.push('className');
  return list;
}

const layoutTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'span', 'strong', 'em', 'br'] as const;

const layoutAttributes = Object.fromEntries(
  layoutTags.map((tag) => [tag, withClassName(tag)]),
) as Schema['attributes'];

/** Allows event layout classes (badge, features, pro, …) while keeping rehype-sanitize defaults. */
export const inAppEventSanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    ...layoutAttributes,
    '*': withClassName('*'),
    a: withClassName('a'),
    img: withClassName('img'),
  },
};
