import {
    IoChevronDownOutline
} from "react-icons/io5";

const DetailsChevron = () => (
    <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-base text-secondary-deep transition group-open:rotate-180"
        aria-hidden="true"
    >
        <IoChevronDownOutline className="block" />
    </span>
);


export default DetailsChevron;
