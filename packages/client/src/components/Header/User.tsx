import { useAppContext } from "../../contexts/AppContext";

export const User = () => {
  const { user } = useAppContext();

  return user ? (
    <div className="user-card">
      <div className="user-card--overview">
        <div className="user-name">{user.user.username}</div>
        <div className="user-instance">{user.service.instance.hostname}</div>
      </div>
      {user.user.picture_url && (
        <img
          src={user.user.picture_url}
          alt="User Avatar"
          className="user-avatar"
        />
      )}
    </div>
  ) : (
    <></>
  );
};
