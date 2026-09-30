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
            style={{
                content: {
                    marginTop: 250,
                },
            }}
            contentClassName="pb-0 px-0"
            onClose={onClose}
            onRequestClose={onClose}
        >
            <div className="px-6 pb-6">
                <h5 className="mb-4">دریافت نوبت</h5>
                <p className="text-lg mb-1">
                    جهت دريافت نوبت مشاوره زیبایی با شماره زیر تماس بگیرید:
                </p>
                <p dir="ltr" className="text-lg self-end  mb-2">
                    <a href={`tel:${clinicInfo.phones.consultation.value}`}>
                        {clinicInfo.phones.consultation.display}
                    </a>
                </p>
                <p className="text-lg  mb-1">
                    جهت دريافت نوبت های درمانی در روزهای کاری مطب با شماره زیر
                    تماس حاصل فرمایید :
                </p>
                <p dir="ltr" className="text-lg self-end  mb-2">
                    <a href={`tel:${clinicInfo.phones.office.value}`}>
                        {clinicInfo.phones.office.display}
                    </a>
                </p>
            </div>
            <div className="text-right px-6 py-3 bg-gray-100 dark:bg-gray-700 rounded-bl-lg rounded-br-lg">
                <Button variant="solid" onClick={onClose}>
                    متوجه شدم
                </Button>
            </div>
        </Dialog>
    );
};

export default ReserveDialog;
