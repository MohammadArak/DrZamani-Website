import classNames from 'classnames'
import Modal from 'react-modal'

Modal.setAppElement('#root')
import CloseButton from '../CloseButton'
import { motion } from "@/components/Motion"
import type ReactModal from 'react-modal'
import type { MouseEvent, ReactNode } from 'react'

export interface DrawerProps extends ReactModal.Props {
    bodyClass?: string
    closable?: boolean
    footer?: string | ReactNode
    footerClass?: string
    headerClass?: string
    height?: string | number
    lockScroll?: boolean
    onClose?: (e: MouseEvent<HTMLSpanElement>) => void
    placement?: 'top' | 'right' | 'bottom' | 'left'
    showBackdrop?: boolean
    title?: string | ReactNode
    width?: string | number
}

const Drawer = (props: DrawerProps) => {
    const {
        bodyOpenClassName,
        bodyClass,
        children,
        className,
        closable = true,
        closeTimeoutMS = 300,
        footer,
        footerClass,
        headerClass,
        height = 400,
        isOpen,
        lockScroll = true,
        onClose,
        overlayClassName,
        placement = 'right',
        portalClassName,
        showBackdrop = true,
        title,
        width = 400,
        ...rest
    } = props

    const onCloseClick = (e: MouseEvent<HTMLSpanElement>) => {
        onClose?.(e)
    }

    const renderCloseButton = <CloseButton onClick={onCloseClick} />

    const vertical=placement==='left'||placement==='right';
    const dimensionClass=vertical?'vertical':'horizontal';
    const dimension=vertical?width:height;
    const size=`min(${typeof dimension==='number'?`${dimension}px`:dimension},${vertical?'100vw':'100dvh'})`;
    const rootStyle=vertical
        ? {position:'fixed' as const,top:0,bottom:0,[placement]:0,width:size,height:'100dvh'}
        : {position:'fixed' as const,left:0,right:0,[placement]:0,width:'100%',height:size};
    const contentStyle=vertical?{[placement]:0,top:0,width:size}:{[placement]:0,left:0,height:size};
    const closedState=vertical?{x:placement==='right'?'100%':'-100%'}:{y:placement==='bottom'?'100%':'-100%'};

    return (
        <Modal
            className={{
                base: classNames('drawer', className as string),
                afterOpen: 'drawer-after-open',
                beforeClose: 'drawer-before-close',
            }}
            overlayClassName={{
                base: classNames(
                    'drawer-overlay',
                    overlayClassName as string,
                    !showBackdrop && 'bg-transparent',
                ),
                afterOpen: 'drawer-overlay-after-open',
                beforeClose: 'drawer-overlay-before-close',
            }}
            portalClassName={classNames('drawer-portal', portalClassName)}
            bodyOpenClassName={classNames(
                'drawer-open',
                lockScroll && 'drawer-lock-scroll',
                bodyOpenClassName,
            )}
            contentLabel={typeof title==='string'?title:'منو'}
            ariaHideApp={true}
            style={{content:rootStyle}}
            isOpen={isOpen}
            closeTimeoutMS={closeTimeoutMS}
            {...rest}
        >
            <motion.div
                className={classNames('drawer-content', dimensionClass)}
                style={contentStyle}
                initial={closedState}
                animate={isOpen?{x:0,y:0}:closedState}
                transition={{duration:.28,ease:[.22,.8,.22,1]}}
            >
                {title || closable ? (
                    <div className={classNames('drawer-header', headerClass)}>
                        {typeof title === 'string' ? (
                            <h4 style={{color:"inherit"}}>{title}</h4>
                        ) : (
                            <span>{title}</span>
                        )}
                        {closable && renderCloseButton}
                    </div>
                ) : null}
                <div className={classNames('drawer-body', bodyClass)}>
                    {children}
                </div>
                {footer && (
                    <div className={classNames('drawer-footer', footerClass)}>
                        {footer}
                    </div>
                )}
            </motion.div>
        </Modal>
    )
}

Drawer.displayName = 'Drawer'

export default Drawer
