import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  User,
} from "@nextui-org/react";

export const AccountsTable = () => {
  return (
    <div className=" w-full flex flex-col gap-4">
      <Table aria-label="Example table with custom cells">
        <TableHeader>
          <TableColumn>Name</TableColumn>
          <TableColumn>Factions</TableColumn>
          <TableColumn>Registered</TableColumn>
          <TableColumn>Activity</TableColumn>
          <TableColumn>Actions</TableColumn>
        </TableHeader>
        <TableBody>
          <TableRow key="1">
            <TableCell>
              <User
                avatarProps={{
                  src: "https://i.pravatar.cc/150?u=a04258114e29026702d",
                }}
                name={"@grant"}
                description="@toast.ooo"
              ></User>
            </TableCell>
            <TableCell>none</TableCell>
            <TableCell>1 hour ago</TableCell>
            <TableCell>1 pixel placed in the last hour</TableCell>
            <TableCell>action</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
