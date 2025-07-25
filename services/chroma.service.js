import {
  isChromaConnected,
  chromaClient,
  embeddingFunction,
} from "../database/chromadb.js";
import Job from "../models/job.model.js";

const COLLECTION_NAME = "jobs";

async function getJobsCollection() {
  if (!isChromaConnected) return null;
  try {
    return await chromaClient.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: embeddingFunction,
      metadata: { "hnsw:space": "cosine" }, // Using cosine distance for similarity
    });
  } catch (error) {
    console.error("Failed to get ChromaDB 'jobs' collection:", error);
    return null;
  }
}

// Helper function to create a single text document from a job for embedding
function formatJobAsDocument(job) {
  const skills = job.skills?.map((skill) => skill.name).join(", ") || "none";
  // console.log("Formatting:");
  // console.log(job);
  return `Title: ${job.title}. Description: ${job.description}. Requirements: ${job.requirements}. Industry: ${job.category?.name}. Location: ${job.location}. Skills: ${skills}.`;
}

/**
 * Creates or updates a job embedding in ChromaDB.
 * @param {string} jobId The MongoDB ID of the job.
 */
export const addOrUpdateJobInChroma = async (jobId) => {
  const collection = await getJobsCollection();
  if (!collection) return;

  try {
    const job = await Job.findById(jobId)
      .populate("categoryId")
      .populate("skillIds");

    if (!job) {
      console.warn(`Job with ID ${jobId} not found for ChromaDB upsert.`);
      return;
    }

    await collection.upsert({
      ids: [job._id.toString()],
      documents: [
        formatJobAsDocument({
          ...job,
          skills: job.skillIds,
          category: job.categoryId,
        }),
      ],
      metadatas: [
        {
          categoryId: job.categoryId.toString(),
          location: job.location,
        },
      ],
    });
    console.log(`Successfully upserted job ${job._id} into ChromaDB.`);
  } catch (error) {
    console.error(`Failed to upsert job ${jobId} in ChromaDB:`, error);
  }
};

/**
 * Deletes a job from ChromaDB.
 * @param {string} jobId The MongoDB ID of the job.
 */
export const deleteJobFromChroma = async (jobId) => {
  const collection = await getJobsCollection();
  if (!collection) return;

  try {
    await collection.delete({ ids: [jobId.toString()] });
    console.log(`Successfully deleted job ${jobId} from ChromaDB.`);
  } catch (error) {
    console.error(`Failed to delete job ${jobId} from ChromaDB:`, error);
  }
};

/**
 * Queries for similar jobs in ChromaDB.
 * @param {string} queryText A text description to search for.
 * @param {number} nResults The number of results to return.
 * @returns {Promise<string[]>} A promise that resolves to an array of job IDs.
 */
export const queryJobsFromChroma = async (queryText, nResults = 10) => {
  const collection = await getJobsCollection();
  if (!collection) return [];

  console.log("Query text:");
  console.log(queryText);

  try {
    const results = await collection.query({
      queryTexts: [queryText],
      nResults: nResults,
    });

    console.log("Fetched the following documents from chroma:");
    console.log(results);

    return results.ids[0] || [];
  } catch (error) {
    console.error("Failed to query ChromaDB:", error);
    return [];
  }
};

/**
 * Syncs all jobs from MongoDB to ChromaDB in batches.
 * Intended for admin use.
 */
export const syncAllJobsToChroma = async () => {
  const collection = await getJobsCollection();
  if (!collection) {
    console.error("Cannot sync jobs, ChromaDB collection is not available.");
    return;
  }

  console.log("Starting full sync of jobs to ChromaDB...");

  const BATCH_SIZE = 100;
  let page = 0;
  let totalProcessed = 0;

  try {
    while (true) {
      const jobs = await Job.find({})
        .populate("skillIds")
        .populate("categoryId")
        .sort({ _id: 1 }) // Sorting ensures consistent batching
        .skip(page * BATCH_SIZE)
        .limit(BATCH_SIZE)
        .lean();

      if (jobs.length === 0) {
        // No more jobs to process
        break;
      }

      const jobIds = jobs.map((job) => job._id.toString());
      const documents = jobs.map((job) =>
        formatJobAsDocument({
          ...job,
          skills: job.skillIds,
          category: job.categoryId,
        }),
      );
      const metadatas = jobs.map((job) => ({
        categoryId: job.categoryId?._id.toString() || "",
        location: job.location || "",
      }));

      await collection.upsert({
        ids: jobIds,
        documents: documents,
        metadatas: metadatas,
      });

      totalProcessed += jobs.length;
      // console.log(
        // `[Chroma Sync] Processed batch ${page + 1}. Total jobs synced: ${totalProcessed}`,
      // );
      page++;
    }

    console.log(
      `!!! Full sync to ChromaDB completed successfully. ${totalProcessed} jobs were processed.`,
    );
  } catch (error) {
    console.error("!!! An error occurred during ChromaDB full sync:", error);
  }
};
