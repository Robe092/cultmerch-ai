import fs from "fs";
import path from "path";
import os from "os";
import { ABComparisonResult, ApprovalStatus, ProductReview } from "@/types";

/**
 * Modes de persistance du magasin CultMerch AI
 * - EPHEMERAL_DEMO : Magasin en mémoire avec scratchpad local temporaire (/tmp).
 *   Adapté au prototypage, aux tests locaux et à la démonstration hackathon.
 *   Note Vercel : Chaque fonction serverless est sans état. En multi-instances Vercel,
 *   deux requêtes concurrentes peuvent être traitées par deux conteneurs différents.
 * - PERSISTENT_DATABASE : Stockage distribué partagé (PostgreSQL, Supabase, Neon ou Vercel KV/Redis)
 *   réservé à un futur adaptateur. Les variables de connexion seules ne constituent pas une intégration.
 */
export type StoragePersistenceMode = "EPHEMERAL_DEMO" | "PERSISTENT_DATABASE";

export interface StorageMetadata {
  mode: StoragePersistenceMode;
  driver: "in_memory_scratchpad" | "postgresql" | "upstash_kv";
  isDistributed: boolean;
  durabilityNote: string;
}

export interface AnalysisStorageAdapter {
  save(analysis: ABComparisonResult): Promise<ABComparisonResult> | ABComparisonResult;
  getById(id: string): Promise<ABComparisonResult | undefined> | (ABComparisonResult | undefined);
  listAll(): Promise<ABComparisonResult[]> | ABComparisonResult[];
  updateStatus(
    id: string,
    status: ApprovalStatus,
    notes?: string
  ): Promise<ABComparisonResult | undefined> | (ABComparisonResult | undefined);
  clear(): Promise<void> | void;
}

export class AnalysisStore implements AnalysisStorageAdapter {
  private analyses: Map<string, ABComparisonResult>;
  private storageFilePath: string;
  private readonly metadata: StorageMetadata;

  constructor() {
    this.analyses = new Map();
    // Scratchpad local /tmp (inscriptible sur macOS / Linux / AWS Lambda / Vercel Serverless)
    const tmpDir = process.env.TMPDIR || os.tmpdir() || "/tmp";
    this.storageFilePath = path.join(tmpDir, "cultmerch_analyses_store.json");

    this.metadata = {
      mode: "EPHEMERAL_DEMO", driver: "in_memory_scratchpad", isDistributed: false,
      durabilityNote: "Mode Démonstration Serverless : mémoire et fichier temporaire du serveur. Aucune base distribuée implémentée ; persistance non garantie entre instances.",
    };

    this.loadFromDisk();
  }

  getStorageMetadata(): StorageMetadata {
    return { ...this.metadata };
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, "utf-8");
        const list: ABComparisonResult[] = JSON.parse(raw);
        for (const item of list) {
          this.analyses.set(item.id, item);
        }
      }
    } catch {
      // Repli silencieux en mémoire pure si le fichier est corrompu ou illisible
    }
  }

  private persistToDisk(): void {
    try {
      const list = Array.from(this.analyses.values());
      fs.writeFileSync(this.storageFilePath, JSON.stringify(list, null, 2), "utf-8");
    } catch {
      // Ne pas bloquer l'exécution si le système de fichiers local est en lecture seule
    }
  }

  save(analysis: ABComparisonResult): ABComparisonResult {
    this.analyses.set(analysis.id, analysis);
    this.persistToDisk();
    return analysis;
  }

  getById(id: string): ABComparisonResult | undefined {
    // Si absent en mémoire (ex: conteneur redémarré avec même volume /tmp), tenter de recharger
    if (!this.analyses.has(id)) {
      this.loadFromDisk();
    }
    return this.analyses.get(id);
  }

  listAll(): ABComparisonResult[] {
    this.loadFromDisk();
    return Array.from(this.analyses.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  updateStatus(
    id: string,
    status: ApprovalStatus,
    notes?: string,
    productNotes?: Record<string, string>
  ): ABComparisonResult | undefined {
    const analysis = this.getById(id);
    if (!analysis) return undefined;

    analysis.product_reviews = Object.fromEntries(analysis.branchB_with_qloo.items.map(({ product }) => [product.sku, {
      status: status === "APPROVED" ? "approved" : status === "REJECTED" ? "revision" : "pending",
      notes: productNotes?.[product.sku] ?? analysis.product_reviews?.[product.sku]?.notes ?? notes, reviewed_at: new Date().toISOString(),
    }]));
    analysis.status = status;
    analysis.approval_metadata = {
      reviewed_at: new Date().toISOString(),
      notes: notes || undefined,
    };
    this.analyses.set(id, analysis);
    this.persistToDisk();
    return analysis;
  }

  updateProductReview(id: string, sku: string, status: ProductReview["status"], notes?: string): ABComparisonResult | undefined {
    const analysis = this.getById(id);
    if (!analysis || !analysis.branchB_with_qloo.items.some(({ product }) => product.sku === sku)) return undefined;
    analysis.product_reviews ??= Object.fromEntries(analysis.branchB_with_qloo.items.map(({ product }) => [product.sku, { status: "pending" }]));
    analysis.product_reviews[sku] = { status, notes, reviewed_at: new Date().toISOString() };
    const reviews = Object.values(analysis.product_reviews);
    analysis.status = reviews.every((review) => review.status === "approved") ? "APPROVED" : reviews.some((review) => review.status === "revision") ? "REJECTED" : "PENDING_REVIEW";
    analysis.approval_metadata = { reviewed_at: new Date().toISOString(), notes };
    return this.save(analysis);
  }

  clear(): void {
    this.analyses.clear();
    try {
      if (fs.existsSync(this.storageFilePath)) {
        fs.unlinkSync(this.storageFilePath);
      }
    } catch {}
  }
}

// Singleton préservé à travers les rechargements HMR Next.js et conteneurs chauds
const globalForStore = globalThis as unknown as { cultMerchStore?: AnalysisStore };
export const analysisStore = globalForStore.cultMerchStore || new AnalysisStore();
globalForStore.cultMerchStore = analysisStore;
