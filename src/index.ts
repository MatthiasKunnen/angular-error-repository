import {
    AbstractControl,
    FormArray,
    FormGroup,
    ValidationErrors,
} from '@angular/forms';

export interface ErrorInterface {
    error: any;
    code: string;
    message: string | null;
}

export interface ErrorMessageInput<T = any> {
    control: AbstractControl;
    error: T;
    value: string | null;
}

export type ErrorMessage<T = any> = (err: ErrorMessageInput<T>) => string | null;

export type PathType = Array<string | number> | string;

/**
 * This repository stores and allows usage of generic error messages.
 *
 * Example usage in a component template:
 * ```Html
 * <mat-error *ngFor="let errorCode of errRepo.getErrors('firstName')">
 *     {{ errRepo.getMessage('firstName', errorCode) }}
 * </mat-error>
 * ```
 *
 * If at some point, a custom message is required, you can overwrite the
 * `errorMessages` in this class or blacklist the error code
 * using the `getErrors` method.
 * ```Html
 * <mat-error *ngFor="let errorCode of errRepo.getErrors('firstName', ['required'])">
 *     {{ errRepo.getMessage('firstName', errorCode) }}
 * </mat-error>
 * <mat-error *ngIf="errRepo.hasError('passwordRepeat', 'required')">
 *     This field is of utmost importance.
 * </mat-error>
 * ```
 */
export class ErrorRepository {

    static readonly errorMessages: {[key: string]: ErrorMessage} = {
    };

    /**
     * @param {FormGroup} form The form used to find fields in.
     */
    constructor(
        private readonly form: FormGroup,
    ) {
    }

    static addErrors(errors: ValidationErrors, ...controls: Array<AbstractControl>): void {
        controls.forEach(control => {
            if (control.errors === null) {
                control.setErrors(errors);
            } else {
                control.setErrors({
                    ...control.errors,
                    ...errors,
                });
            }
        });
    }

    /**
     * Get all the errors of a certain control. Errors without message generator are ignored.
     * @param {AbstractControl} control The control of which the errors will be returned.
     * @param {Array<string>} blacklist An array of error codes that will be ignored. Use this if
     * you want to write a custom error message for specific error codes.
     */
    static getErrors(
        control: AbstractControl,
        blacklist: Array<string> = [],
    ): Array<ErrorInterface> {
        if (control.errors === null) {
            return [];
        }

        return Object.entries(control.errors)
            .filter(([errorCode]) => !blacklist.includes(errorCode))
            .filter(([errorCode]) => errorCode in ErrorRepository.errorMessages)
            .map(([errorCode, error]) => ({
                code: errorCode,
                error,
                message: ErrorRepository.errorMessages[errorCode]({
                    control: control,
                    error: error,
                    value: control.value,
                }),
            }));
    }

    static removeErrors(errorNames: Array<string>, ...controls: Array<AbstractControl>): void {
        controls.forEach(control => {
            const errors = control.errors;
            if (errors === null) {
                return;
            }

            errorNames.forEach(name => delete errors[name]);

            control.setErrors(errors);
        });
    }

    static getAllControls(controls: Array<AbstractControl>): Array<AbstractControl> {
        const output: Array<AbstractControl> = [];

        controls.forEach(control => {
            output.push(control);

            if (control instanceof FormGroup) {
                output.push(...this.getAllControls(Object.values(control.controls)));
            } else if (control instanceof FormArray) {
                output.push(...this.getAllControls(control.controls));
            }
        });

        return output;
    }

    getAllControls(): Array<AbstractControl> {
        return ErrorRepository.getAllControls(Object.values(this.form.controls));
    }

    /**
     * Get all errors of a field.
     * @param path The name of the field to search for or the field itself.
     * @param {Array<string>} blacklist An array of error codes that won't be
     * returned. Use this if you want to write a custom error message for
     * specific error codes.
     */
    getErrors(path: AbstractControl | PathType, blacklist?: Array<string>): Array<ErrorInterface> {
        const field = this.getControl(path);

        if (field === null) {
            console.warn('Field is null, returning empty array list for path', path);
            return [];
        }

        if (!this.isErrorState(field)) {
            return [];
        }

        return ErrorRepository.getErrors(field, blacklist);
    }

    /**
     * Checks whether a certain field has a certain error.
     * @param path The name of the field to search for or the field itself.
     * @param {string} errorCode The error code to search for.
     * @returns {boolean}
     */
    hasError(path: AbstractControl | PathType, errorCode: string): boolean {
        const control = this.getControl(path);

        if (control === null) {
            console.warn(`Control is null, returning no error for code ${errorCode} path`, path);
            return false;
        }

        const errors = control.errors !== null ? Object.keys(control.errors) : [];

        return errors.includes(errorCode);
    }

    /**
     * Checks whether a certain field has any errors.
     * @param path The name of the field to search for or the field itself.
     * @returns {boolean}
     */
    hasErrors(path: AbstractControl | PathType): boolean {
        const control = this.getControl(path);

        if (control === null) {
            console.warn(`Control is null, returning no error for path`, path);
            return false;
        }

        const errors = control.errors !== null ? Object.keys(control.errors) : [];

        return errors.length > 0;
    }

    /**
     * Error when invalid control is dirty, touched, or submitted.
     */
    isErrorState(control: AbstractControl | null): boolean {
        if (control === null) {
            return false;
        }

        return control.invalid && (control.dirty || control.touched);
    }

    private getControl(path: PathType | AbstractControl | null): AbstractControl | null {
        return path === null || path instanceof AbstractControl
            ? path
            : this.form.get(path);
    }
}
