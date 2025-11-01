import { error } from '@sveltejs/kit';

/** @type {import('./$types').EntryGenerator} */
export async function entries() {
  // Get all .svx files from the posts directory
  const modules = import.meta.glob('../../posts/*.svx');
  const slugs = [];
  
  for (const path in modules) {
    // Extract filename without extension as slug
    const slug = path.split('/').pop()?.replace('.svx', '');
    if (slug) {
      slugs.push({ slug });
    }
  }
  
  return slugs;
}

export const prerender = true;

export async function load({ params }) {
  try {
    const post = await import(`../../posts/${params.slug}.svx`);
    
    return {
      post: {
        default: post.default,
        metadata: {
          title: post.metadata?.title,
          description: post.metadata?.description,
          slug: params.slug,
          ...post.metadata
        }
      }
    };
  } catch (e) {
    throw error(404, `Could not find post ${params.slug}`);
  }
}
