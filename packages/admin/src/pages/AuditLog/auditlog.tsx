import { useEffect, useState } from "react";
import { api, handleError } from "../../lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";

type AuditLogAction = "BAN_CREATE" | "BAN_UPDATE" | "BAN_DELETE";

type AuditLog = {
  id: number;
  userId: string;
  action: AuditLogAction;
  reason?: string;
  comment?: string;

  banId?: number;

  createdAt: string;
  updatedAt?: string;
};

export const AuditLog = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api<{ auditLogs: AuditLog[] }>("/api/admin/audit", "GET").then(
      ({ status, data }) => {
        if (status === 200) {
          if (data.success) {
            setAuditLogs(data.auditLogs);
          } else {
            handleError(status, data);
          }
        } else {
          handleError(status, data);
        }
      }
    );
  }, []);

  return (
    <>
      <h4 className="text-l font-semibold">Audit Log</h4>
      <div className="relative">
        <Table>
          <TableHeader>
            <TableColumn>ID</TableColumn>
            <TableColumn>User ID</TableColumn>
            <TableColumn>Action</TableColumn>
            <TableColumn>Reason</TableColumn>
            <TableColumn>Comment</TableColumn>
            <TableColumn>Created At / Updated At</TableColumn>
          </TableHeader>
          <TableBody>
            {auditLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.id}</TableCell>
                <TableCell>{log.userId}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.reason}</TableCell>
                <TableCell>{log.comment}</TableCell>
                <TableCell>
                  {log.createdAt} / {log.updatedAt}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
