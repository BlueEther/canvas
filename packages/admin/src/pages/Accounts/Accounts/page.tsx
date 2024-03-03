import { faFile } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BreadcrumbItem, Breadcrumbs, Button, Input } from "@nextui-org/react";
import { AccountsTable } from "./AccountsTable";

export const AccountsPage = () => {
  return (
    <div className="my-14 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <Breadcrumbs>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem>Accounts</BreadcrumbItem>
      </Breadcrumbs>

      <h3 className="text-xl font-semibold">All Accounts</h3>
      <div className="flex justify-between flex-wrap gap-4 items-center">
        <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
          <Input
            classNames={{
              input: "w-full",
              mainWrapper: "w-full",
            }}
            placeholder="Search users"
          />
          {/* <SettingsIcon />
          <TrashIcon />
          <InfoIcon />
          <DotsIcon /> */}
        </div>
        <div className="flex flex-row gap-3.5 flex-wrap">
          {/* <AddUser /> */}
          <Button
            color="primary"
            startContent={<FontAwesomeIcon icon={faFile} />}
          >
            Export to CSV
          </Button>
        </div>
      </div>
      <div className="max-w-[95rem] mx-auto w-full">
        <AccountsTable />
      </div>
    </div>
  );
};
