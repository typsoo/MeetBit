import { getAuth } from '@/server/auth';
import { getDatabase } from '@/server/db';

const handleRequest = async (request: Request): Promise<Response> => {
  const db = getDatabase();
  if (!db) {
    return new Response('DATABASE_URL is required for authentication', {
      status: 500,
    });
  }

  return getAuth(db).handler(request);
};

export { handleRequest as GET, handleRequest as POST };
