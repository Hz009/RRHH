import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { acknowledgeDocumentAction, uploadAndCreateDocumentAction } from "@/app/(backoffice)/documents/actions";
import { getCurrentUserRole } from "@/services/employees.service";
import { getDocumentAssignableEmployees, getDocumentsForCurrentUser } from "@/services/documents.service";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { DocumentsListPanel } from "@/components/documents/documents-list-panel";

export default async function DocumentsPage() {
  const [role, documents, employees] = await Promise.all([
    getCurrentUserRole(),
    getDocumentsForCurrentUser(),
    getDocumentAssignableEmployees(),
  ]);
  const isAdmin = role === "admin";

  const formEmployees = employees.map((e) => ({
    id: e.id,
    full_name: e.full_name,
  }));

  return (
    <div>
      <Topbar title="Documentos" subtitle="Gestion de documentos, contratos, politicas y confirmaciones." />
      <div className="space-y-6 p-6">
        {isAdmin ? (
          <Card title="Subir documento">
            <DocumentUploadForm
              action={uploadAndCreateDocumentAction}
              employees={formEmployees}
            />
          </Card>
        ) : null}

        <DocumentsListPanel
          documents={documents}
          acknowledgeAction={acknowledgeDocumentAction}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
