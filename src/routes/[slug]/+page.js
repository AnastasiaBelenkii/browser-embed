import { error } from '@sveltejs/kit';

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
