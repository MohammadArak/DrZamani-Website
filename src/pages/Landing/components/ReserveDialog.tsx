import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";

const ReserveDialog = ({
    dialogIsOpen,
    onClose,
}: {
    dialogIsOpen: boolean;
    onClose: () => void;
}) => {
    const { clinicInfo } = useClinicInfo();

    return (
        <Dialog
            isOpen={dialogIsOpen}
            className="reservation-dialog"
            overlayClassName="reservation-overlay"
            style={{
                content: {
                    marginTop: "10vh",
                },
            }}
            contentClassName="pb-0 px-0 bg-white"
            contentLabel="رزرو نوبت"
            onClose={onClose}
            onRequestClose={onClose}
        >
            <div className="px-6 pb-6">
                <h2 className="mb-4 text-slate-900">رزرو نوبت</h2>
                <p className="text-lg leading-8 whitespace-pre-line text-slate-800">{clinicInfo.bookingDisabledMessage}</p>
            </div>
            <div className="text-right px-6 py-3 bg-gray-100 rounded-bl-lg rounded-br-lg">
                <Button variant="solid" onClick={onClose}>
                    متوجه شدم
                </Button>
            </div>
        </Dialog>
    );
};

export default ReserveDialog;
