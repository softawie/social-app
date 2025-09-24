import { UserRoles } from "@utils/enums";

export const endPoints = {
    getSingleUser: [UserRoles.ADMIN, UserRoles.USER],
    updateProfileImage: [UserRoles.ADMIN, UserRoles.USER],
    updatePassword: [UserRoles.ADMIN, UserRoles.USER],
    freezeAccount: [UserRoles.ADMIN, UserRoles.USER],
    unfreezeAccount:  [UserRoles.ADMIN],
    deleteAccount: [UserRoles.ADMIN],
};
